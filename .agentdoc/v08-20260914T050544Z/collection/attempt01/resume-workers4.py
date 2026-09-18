"""Authorized concurrency-only transition; preserve every original stage and raw byte."""
from pathlib import Path
import datetime
import hashlib
import json
import os
import signal
import subprocess
import time

base = Path(__file__).resolve().parent
root = base.parents[3]
records = base / "resume-workers4"
node = "/Users/jeongyounglee/.nvm/versions/node/v20.12.2/bin/node"
evaluator = root / ".harness/v8/measure.mjs"
records.mkdir(exist_ok=False)


def stamp():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def read(path):
    return json.loads(path.read_text())


def write(name, value):
    with (records / name).open("x") as handle:
        json.dump(value, handle, indent=2)
        handle.write("\n")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fingerprint():
    return json.loads(subprocess.check_output([node, str(evaluator), "fingerprint"], cwd=root, text=True))


def run_stage(name, args):
    command = [node, str(evaluator), *map(str, args)]
    with (records / (name + ".log")).open("x") as log:
        child = subprocess.Popen(command, cwd=root, stdin=subprocess.DEVNULL, stdout=log, stderr=log)
        row = {"stage": name, "pid": child.pid, "supervisorPid": os.getpid(), "startedAt": stamp(), "command": command}
        write(name + ".start.json", row)
        code = child.wait()
        write(name + ".exit.json", {**row, "endedAt": stamp(), "returncode": code})
        if code != 0:
            raise RuntimeError(f"{name} exited {code}")


try:
    binding = read(base / "binding.json")
    write("launch.json", {"startedAt": stamp(), "supervisorPid": os.getpid(), "script": str(Path(__file__).resolve()),
                          "scriptSha256": digest(Path(__file__)), "originalSupervisorPid": 42055,
                          "authorization": "Parent approved transition after exploration verify/freeze; stop only owned validation child and resume workers4 with unchanged output, freeze, evaluator and seeds."})
    assert binding["supervisorPid"] == 42055
    expected = [node, str(evaluator), "run", str(base / "validation.json"), "--seed-set", "validation", "--workers", "2", "--freeze", str(base / "freeze.json")]
    deadline = time.monotonic() + 1800
    while not (base / "04-validation-run.start.json").exists():
        if (base / "completion.json").exists():
            raise RuntimeError("Original pipeline ended before validation transition: " + str(read(base / "completion.json")))
        if time.monotonic() > deadline:
            raise RuntimeError("Timed out waiting for owned validation stage")
        time.sleep(0.5)
    started = read(base / "04-validation-run.start.json")
    assert started["supervisorPid"] == 42055 and started["command"] == expected
    assert not (base / "04-validation-run.exit.json").exists()
    assert (base / "02-exploration-verify.exit.json").exists() and read(base / "02-exploration-verify.exit.json")["code"] == 0
    assert (base / "03-evaluator-freeze.exit.json").exists() and read(base / "03-evaluator-freeze.exit.json")["code"] == 0
    assert fingerprint() == binding["fingerprint"]
    actual_command = subprocess.check_output(["ps", "-p", str(started["pid"]), "-o", "command="], text=True).strip()
    assert actual_command == " ".join(expected), actual_command
    write("transition-request.json", {"at": stamp(), "targetPid": started["pid"], "signal": "SIGTERM", "actualCommand": actual_command,
                                      "reason": "Authorized worker count change 2 -> 4 only; preserve original FAIL and resume immutable raw files."})
    os.kill(started["pid"], signal.SIGTERM)
    deadline = time.monotonic() + 30
    while not (base / "completion.json").exists():
        if time.monotonic() > deadline:
            raise RuntimeError("Original supervisor did not record its interrupted exit")
        time.sleep(0.1)
    ended = read(base / "04-validation-run.exit.json")
    complete = read(base / "completion.json")
    assert ended["pid"] == started["pid"] and ended["signal"] == "SIGTERM" and ended["code"] is None
    assert complete["status"] == "FAIL"
    frozen = digest(base / "freeze.json")
    original_raw = {str(path.relative_to(base)): digest(path) for path in (base / "validation.json.runs").glob("*/*.json")}
    write("resume-binding.json", {"at": stamp(), "fingerprint": fingerprint(), "freezeSha256": frozen,
                                 "originalInterruption": ended, "originalCompletion": complete, "completedRawBeforeResume": original_raw})
    assert fingerprint() == binding["fingerprint"]
    run_stage("01-validation-resume", ["run", base / "validation.json", "--seed-set", "validation", "--workers", "4", "--freeze", base / "freeze.json"])
    run_stage("02-validation-verify", ["verify", base / "validation.json"])
    assert fingerprint() == binding["fingerprint"] and digest(base / "freeze.json") == frozen
    assert all(digest(base / path) == value for path, value in original_raw.items())
    write("completion.json", {"status": "PASS", "completedAt": stamp(), "supervisorPid": os.getpid(), "samples": len(read(base / "validation.json")["raw"]),
                              "rawBeforeResumeUnchanged": True, "originalInterruptionPreserved": True,
                              "fingerprint": binding["fingerprint"], "freezeSha256": frozen, "validationSha256": digest(base / "validation.json")})
except Exception as error:
    write("completion.json", {"status": "FAIL", "completedAt": stamp(), "supervisorPid": os.getpid(), "error": str(error)})
    raise
