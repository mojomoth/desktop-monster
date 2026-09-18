# V07-05 — Round05 first adopted validation FAILED

App0.6.0; candidate-r5-tail10475; source3e563b2dd99f4755644bff3f74dd33d5def260c605c27f2a771609264ab7a8be/evaluatorc230862f43dd51266a53cf924c95c22d60d4983bc93f82dc6d44f4116e77b8b3.

The actual untouched validation1–100×12h is complete and structurally valid. First success population p50=2492.8sec (target2700–3600) and deadline success88/100 by5400sec (required90) both FAIL. Final h70eligibility populationp50=35144sec PASS;62/100eligible,38unreached,actualchosen0. Conditional h70p5023494sec is reported separately. All100 first successes reached by6239sec; no substitution of success-only statistics or reduced denominators.

Independent final validation analysis SHA44ad1514262ceddccd0040bbe5db5eb87f069bd5701f882c1b79337a3b2471e5; README SHA3de4cb2ab4c2d7c60ac9bdf2b8dc4e9bb839f6f7643f4a78457f93b6e69d4e79. Immutable candidate.json SHA9286dd20e7f125f25a0bae1189daf6be9d429053a49732b145ced42238d4f803 and validation-round05-v060 execution/source/eval/build/runs/logs preserved. Exec6049 ended1 because goals fail; structural verify exited0.

Registered checks on the same source/evaluator:
- progression: exit0; V07-05-1789193547130.log; SHA256 5cd62b0718a698addb957eb69d6854639abb586c576d6e22484852f2a97fe726
- harness: exit0; V07-05-1789193550791.log; SHA256 4ad59ea8c8bbb45b9065532a8bb749ac7f960cf28676385d35c372ec9ada707a
- gates: exit0; V07-05-1789193557069.log; SHA256 c7de54949b12d73ec628a2793b70bc51368d73fcd2334dc03638de62d2d3e1cc
- measurement: exit1; V07-05-1789194386876.log; SHA256 040395a9e1c658b09903e8bb24da55dea25990816c442e785398343e427b43fc

Progression36, harness138 and exact npm test && npm run lint && npm run typecheck (922 producttests) passed; measurementAC failed. V05 is NOT verified. No version0.7 bump or release phase advancement. No final Native/audit/smoke/package/live-server validation performed. humanChecks=PENDING.

Next: invalidate V01 and descendants, preserve failed adoption, preregister a new <=3-candidate round using ONLY existing exploration10001–10020 and production logic for numeric design. Designer/Critic were not given validation values and were instructed not to read candidate.json/validation files/current status docs. No validation seed optimization. New candidate output must use a NEW registered AC path; do not overwrite candidate.json.
