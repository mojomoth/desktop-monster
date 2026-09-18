# Equipment and economy implementation

The approved product rules are in [CONTRACT.md](CONTRACT.md). Numerical candidates
are registered in [BALANCE_CANDIDATE.json](BALANCE_CANDIDATE.json); acceptance
criteria and held-out seeds are in [EVALUATION_PROTOCOL.json](EVALUATION_PROTOCOL.json).
Candidate C was selected from three registered candidates and passed the complete
100-seed held-out evaluation. [BALANCE_REPORT.md](BALANCE_REPORT.md) records the
selection, observed distributions, opportunity costs and interpretation limits.

## Exact displayed attack

The weapon grants a percentage of the trained hero's base attack. This preserves
its usefulness after soul growth and repeated reincarnation. A fixed flat addition
at the end of the formula was rejected: the independently preserved baseline
already reached roughly 1.7 million base attack, making even +960 negligible.

For base attack B, weapon bonus W basis points, and four additive accessory bonuses A:

    displayed attack = floor(B × (10000 + W) × (10000 + sum(A)) / 100000000)

Item primary power grows by 10% of its original rolled value per enhancement.
Critical chance and party attack are separate secondary properties. They do not
influence automatic equipment selection. Party bonuses apply before elemental
multipliers in both field and PvP; integer rounding is identical.

Selection maximizes the displayed integer, then retained equipment count, occupied
slot count, and stable numeric instance IDs. Merely sorting raw item powers is
insufficient because unequal raw powers can round to the same displayed integer.
The implementation sorts once and uses suffix summaries of at most four accessories
and one weapon per retention group to select the exact tie winner in O(N log N).
Copies of the same definition remain separate instances. Temporary items participate
in ordinary re-evaluation. A hero change removes the old temporary batch before
selection, as required by the deletion confirmation contract.

## Money and enhancement

Runtime wallet and lifetime gold spending are bigint. Save v4, IPC and HTTP use
canonical decimal strings. Safe legacy numeric wallets migrate exactly. Present
malformed or unsafe wallet, spending, net ledger or debt values trigger recovery;
missing legacy fields receive their documented defaults. No money is silently
rounded or reset to zero.

For existing enhancement n, the next enhancement cost is C × 2^n, with C defined
by the item's rarity and tier. A cost is represented symbolically as its base and
number of doublings. Affordability first compares the wallet's bit length, so an
unaffordable enormous exponent never allocates an enormous bigint. The displayed
price may use the exact symbolic expression; neither price nor enhancement is capped.

Targets +1 through +5 have success probability 1. For target t > 5, probability
is K / (K + t - 5). It strictly decreases, remains positive, and uses unbiased
integer rejection sampling rather than rounding to a percentage or a probability
floor. Failure atomically debits gold and removes the physical item. Successful
and failed attempts are deterministic for the saved item seed and attempt count.
Local backup rollback resistance remains the same self-reported trust model as
existing progression; deterministic attempts do not claim to prevent all rollback
or sequence-search abuse.

## Ownership, time and persistence

One physical UID occupies exactly one owned location: equipped, bag or temporary.
Shop stock retains the original rolled offer and marks sold UIDs. Purchase checks
reject a UID already owned and any transaction that would erase old temporary items.
The allocator advances past owned items and persisted stock on reload.

A simulation frame is one equipment batch. The first overflow replaces the old
temporary contents; subsequent overflow in the same batch appends. A hero change
clears the old batch only after confirmation matching target, offer serial, hero
revision, temporary revision and exact item IDs. Standalone engine calls create and
finish their own batch; production frame begin/end APIs join hero actions and boss
drops. Selected bag items leave before unequipped items need storage.

The shop clock is real elapsed wall time injected by the host. Persisted maximum
observed time prevents clock rollback from refreshing stock. The next refresh is
the next hourly boundary. Restart preserves stock, private rolls and bought flags.

## PvP and probability evidence

Heroic PvP supports one hero and zero to five companions per side. Sides alternate;
actors rotate through hero then front-first companions, while targets use companions
then hero. Hero HP is five times trained base attack before equipment. Equipment
and team passives are frozen at entry. Seeded critical rolls and typed actor/target
records produce reproducible replays. Legacy companion-only replay remains readable.

Epic appearance and item drop are independent and never use ordinary rare pity,
tracking or compensation. A particular template's chance additionally depends on
the number of eligible legendary bosses and the selected boss's loot table. The
simulation reports observed zero acquisitions and separate per-template theoretical
non-acquisition probabilities. The theoretical opportunity count includes the most
recent spawned boss even when that boss is still alive at a checkpoint; observed
acquisitions count only completed kills. It is not a guaranteed time-to-drop claim.

The balance simulation verifies the currency identity
initial wallet + ordinary income + sale income - spending = current wallet,
unique owned UIDs, valid loadouts and boss-only equipment events. Mechanical formula
invariants also have direct unit tests. Independent review checks integer-rounding
ties, temporary reassessment, overflow replacement and unbounded enhancement costs.
Human enjoyment and hardware Windows behavior require their separately reported
checks; simulation does not certify either.

## Registered policy interpretation and historical comparison

The eight registered labels contain seven distinct behavior definitions.
`new-active` uses a ten-minute hero-menu visit as its default, and
`deferred-rebirth` deliberately repeats that same control behavior. Matching
seeds therefore produce identical trajectories for those two labels. Immediate
versus ten-minute deferred visits remain a real comparison. The validation runs
100 seeds for each of eight labels; this must not be described as 800 independent
behavior experiments. Three checkpoints within one trajectory are correlated as
well. This limitation was recorded before the held-out equipment run.

The independent preserved v0.9.1 reference is
`.agentdoc/v10-20260917T070144Z/baseline/validation-02/report.json`: 100 seeds for
four policies, 1,200 checkpoint rows, source-bound to preserved compiled core.
It uses 100ms ticks, input every500ms, and no purchases or companion management.
Its active-ten-minute-visits policy is the closest behavioral reference for the
new-active/deferred control. The new immediate policy visits every5s versus the
old baseline's every1s. The two idle scenarios also start differently. Gold and
progression distributions across these runs are descriptive references, not a
controlled claim that equipment alone caused every difference. Ordinary coin
issuance per monster remains unchanged and has independent formula tests.
