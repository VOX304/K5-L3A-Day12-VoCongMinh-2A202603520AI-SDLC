# SPEC — Đảo Đèn Lồng

Trạng thái: hợp đồng triển khai, chưa có mã hoặc kết quả kiểm chứng. [PRD](PRD.md) định nghĩa gate. Nguồn ưu tiên: `docs/requirements/Phase1.md`…`Phase4.md` theo phase đang xét, `RUBRIC.md`, `RULES.md`, `GLOSSARY.md`; ticket không được hạ yêu cầu. Các lựa chọn dưới đây là thiết kế/giả định của dự án, không phải yêu cầu mới của giảng viên.

## 1. Kiến trúc và ranh giới

TypeScript; browser dùng Vite + Three.js, Node chạy CLI và HTTP server nhỏ. Chọn bản Node LTS và dependency cụ thể khi khởi tạo, khóa trong lockfile, ghi phiên bản đã thử; không dùng CDN. Không physics engine. Cùng lõi gameplay 60 Hz cho browser/headless, không có luật trong render.

| Module dự kiến | Trách nhiệm / giao diện | Không được phụ thuộc |
|---|---|---|
| `src/sim/model`, `tuning`, `rng` | Kiểu dữ liệu, constants, PRNG uint32, timer; không IO | Three.js, DOM, clock hệ thống, filesystem |
| `src/sim/world` | Bản đồ chuẩn, surface/collision/sweep và điểm sinh; dữ liệu hình học duy nhất cho sim và render | Mesh hoặc scene Three.js |
| `src/sim/rules` | Luật lantern/win/score của bản đang xây; hàm thuần trên state | UI, CLI, storage |
| `src/sim/step` | `createGame(seed, night, scenario)`, `step(state,input) -> {state,events}`; thứ tự tick và reset Đêm | Wall clock, âm thanh, render |
| `src/contract` | Validate inputs/scenario, manifest/tuning, snapshot và JSONL theo phiên bản của tag | Three.js/DOM; không sao chép luật sim |
| `src/cli` | Parse args, đọc/ghi file, chạy headless/soak; bench điều khiển browser | Luật riêng thay cho `step` |
| `src/browser` | Fixed-step loop, input/camera, render, HUD/menu/settings, WebAudio; chỉ đọc state/events để trình bày | Thay đổi trực tiếp fuel/score/collision |
| `src/server` | Phục vụ `dist`, API leaderboard/ghi đĩa, export CLI | Sim tick, browser localStorage |
| `tests`, `scripts/verify` | Unit, fixture headless, replay, browser/checklist và báo cáo gắn mã | Kết quả giả hoặc test luôn xanh |

Geometry được dựng từ mô tả số (đĩa, vành khăn, cầu chữ nhật, dốc, trụ) rồi mới tạo mesh. Surface query phải xét độ cao trước bước và quỹ đạo: lên vách bị chặn, đi ra mép thì rơi, cắt mặt sàn khi đang hạ xuống thì đáp. Không lấy Y lớn nhất tại XZ rồi teleport. Sweep/substep tránh xuyên cầu/vách/tháp lúc dash; đáp bục/đất mới giải phóng vận tốc phóng. Địch không tự đi qua vật cản/vùng safe; không cần navmesh tổng quát.

Browser: `requestAnimationFrame` tích lũy thời gian, gọi `step(1/60)` đủ bước và nội suy để vẽ; không đổi dt theo FPS. Khi ẩn tab tự pause bằng đường input, bỏ thời gian ẩn khỏi accumulator; không chạy bù hàng phút. Render/SFX/âm lượng/độ nhạy/remap không đổi seed hay quy tắc. Settings localStorage có phiên bản và defaults khi hỏng. Cờ `presentationExtras` chỉ điều khiển múa rối Ông Đăng, mặc định false ở headless/bench/soak; nhạc/SFX bắt buộc vẫn có trong chơi thường. Reset Đêm giải phóng scene/listener/timer và state cũ.

## 2. Phiên bản và cô lập thay đổi luật

| Tag | Manifest / dữ liệu công khai | Luật |
|---|---|---|
| `phase-1` | `contract_version:"1.0"`; schema v1.0, night=1 | Chọn số tương ứng P2 ngay từ đầu; jump, fall và vật lý Đêm 1 có thật. Đèn chưa sáng nhận nạp, sáng vĩnh viễn; all_lit thắng, dawn thua; score P2. Chưa dash/pause/đêm 2–3. |
| `phase-2` | `"1.1"`, schema v1.1, nights 1–3 | P2 toàn bộ; lantern/win vẫn như P1; durations 300/330/360; dash/pause/charm/drifter/wind. |
| `phase-3` | `"1.2"`, schema v1.2 | Thay LanternRules/WinRules/ScoreRules: fuel, relight, drain, capacity; durations 240/270/300; chỉ thắng bình minh. |
| `phase-4` | `"1.3"`, thêm bench_cmd/soak_cmd | Giữ gameplay v1.2, thêm chức năng phát hành. Cảnh bench là mode rõ ràng, không nới luật trong chơi thường. |

Không thêm cờ CLI chọn luật cũ trong bản cuối. Mỗi tag chứa đúng luật/schema lúc đó; dùng `LanternRules` (`eligible/accept/tick/isSafe`), `WinRules.evaluate`, `ScoreRules` làm seam khi P3 thay đổi. Không rải `if(version)` khắp UI/hệ thống địch. Chỉ adapter contract chịu trách nhiệm trường public. Test lịch sử giữ ở tag cũ; bản mới chạy lại các test còn hiệu lực và test đã cập nhật kèm lý do. Contract v1.3 giữ v1.2 cùng các phần v1.0–1.1 chưa bị thay, không khôi phục all_lit.

## 3. Mô hình dữ liệu và bất biến

| Dữ liệu | Nội dung tối thiểu trong sim |
|---|---|
| `GameState` | seed, PRNG state, night, tick, sim_tick, state playing/paused/won/lost, remainingTicks, score Đêm, results Đêm đã thắng, các bộ đếm id/lịch sinh; `paused` chỉ từ v1.1 |
| `Player` | pos là chân, vel, facing ngang (đầu Đêm +Z), grounded/surfaceId, carried, flames, invulnTicks, pulseCdTicks; từ P2 dashCd/dashTicks/dashDir, charmTicks, respawnTicks và launchVelocity; từ P3 successful_lights/capacity |
| `Lantern` trước P3 | id, pos chân cột, lit, deposited; `0≤deposited≤10`; chỉ đèn chưa sáng nhận |
| `Lantern` từ P3 | thêm fuelUnits nguyên 0…6000 (1 đơn vị =1/60 fuel), ever_lit, relit_count; unlit có fuel=0, deposited=0 sau khi cạn; lit có ever_lit=true |
| `Shade` | id, pos tâm, state spawning/wander/chase/recoil/stunned; stateTicks, push/recoil còn lại, safeEjectTicks; P3 thêm drain và target_lantern_id |
| `Mote` | id, pos điểm trên mặt đất, kind random/dropped, ttlTicks (random không hết hạn), bornSimTick để chặn nhặt cùng tick sinh |
| `Drifter`, `Charm` | drifter: id/pos/state/stolen/stateTicks/bornSimTick; charm: id/pos/available/respawnTicks |
| `Wind`, `InputLatch` | active/dir_deg/chu kỳ/cảnh báo; input hiện tại và giá trị nút trước bước để tính cạnh lên |
| `Campaign`, `LeaderboardEntry` | Campaign nằm ngoài một phiên headless: điểm và số Đêm đã thắng; entry: name, score, nights_won, achieved_at (ISO có múi giờ), seed |

Timer/cooldown/TTL đều là tick nguyên; pause chỉ tăng tick, không tăng sim_tick. `remainingTicks` giảm tới 0, thời gian công khai =remainingTicks/60. Scenario time chuyển sang tick gần nhất nếu có phần lẻ không biểu diễn được ở 60 Hz (ghi giả định). Đầu mỗi Đêm reset máu=3, carry=0, successful_lights=0, capacity=10; chơi lại giữ điểm các Đêm thắng trước đó, không cộng lần thua hay lần thắng cũ hai lần.

Khoảng cách mặc định XZ giữa các điểm contract; nhặt/hit có kiểm chênh cao ≤1.5; pulse dùng 3D từ chân Mây+(0,0.8,0) tới tâm địch. Không tự thêm điều kiện độ cao cho interact/safe/drifter khi nguồn không có. Trong bán kính nghĩa là ≤. Tie chọn id theo tiền tố rồi số thứ tự (S2 trước S10), không phụ thuộc locale. ID tự sinh tăng riêng mỗi loại, không tái sử dụng trong Đêm; scenario có id phải được giữ và tránh trùng với id sinh sau.

Các số dùng từ P1: chạy6; nhảy7/gravity−20; capacity10; cost10; pickup1/interact2/safe6; pulse cost3/radius5/cooldown180/stun120/push4 trong15 tick; shade4/hit1; flames3/invuln90/drop floor(carried/2); Đêm1=300 s. Fall bật: Y<−10 mất1 máu và toàn carry, chờ60 tick rồi respawn/invuln90. Tuning score trước P3: per_mote=10 (mỗi con **nạp**, không phải nhặt), per_lantern=100, per_stun=5, per_second_left=2, per_flame_left=50. Manifest còn khai hit_drop_ratio=0.5 và đúng mọi khóa nguồn; mã và manifest dùng chung constants.

Từ P2 dùng đủ số và tọa độ P2 Phần1–3; không chép số khác vào render. Chạy tăng tốc/dừng tức thời được chọn (0≤0.1 s). Dash14/12 tick/cooldown90 từ lúc bắt đầu, không bất tử; trên không giữ Y, tạm giữ vận tốc Y rồi tiếp tục sau dash. Phóng bục khóa vận tốc ngang tới khi đáp, dash tạm ghi đè rồi tiếp tục hướng phóng. Collision và hướng input vẫn theo contract; fixture phải kiểm các lựa chọn tích phân này.

### Lantern/score/win từ v1.2

- `maxFuelUnits=6000`, `threshold=1800`. Step2 trừ1 mỗi đèn sáng và thêm5 cho mỗi shade đang drain hợp lệ từ đầu bước; clamp≥0. Không làm tròn trước so ngưỡng. Đèn≤0 tắt ngay, deposited=0, ever_lit giữ true, event lantern_out một lần. Đèn được thắp ở step5 bắt đầu hao từ bước sau.
- Interact lọc đèn nhận được trong2 m rồi chọn gần nhất/id: tắt dùng cost10 nếu chưa từng sáng, cost5 nếu ever_lit; chuyển đủ thì fuel=6000, successful_lights++, capacity=min(20,10+2×successful_lights). Lần đầu +100, thắp lại +40 và relit_count++; mọi con nạp +5. Nạp dở vẫn được nhớ.
- Đang sáng: `used=min(carried,ceil((6000-fuelUnits)/600))`; tăng600 mỗi con tới6000, +5×used; used0 thì không chọn/không event/không thưởng. `refuel.data.fuel` là fuel sau châm. Không phát deposit cho cùng lần refuel.
- Đèn sáng fuel≥30 tạo safe6; <30 mất safe. Khi mới sáng hoặc châm lên≥30, đẩy bóng đang trong vùng ra mép trong tối đa30 tick, không hit trong lúc đẩy. Đèn vừa hao qua ngưỡng mất safe trước bước di chuyển địch.
- Chỉ wander chọn đèn sáng yếu gần nhất; không có thì hướng về đèn tắt gần nhất. Chase giữ luật đuổi cũ. Tới≤2 XZ thì drain/đứng yên; sau đó đổi chase khi Mây≤6, stunned khi pulse, wander khi mục tiêu tắt/đạt≥30/ra ngoài2; hết stunned→wander. Nhiều drain cộng dồn; bóng mới vào drain ở step8 bắt đầu hút ở step2 bước sau.
- Pulse score mỗi bóng +5, hoặc tổng +15 nếu ngay trước pulse đang drain (không cộng thành20); +5 mỗi lần lại trúng cả bóng đã stunned. Drifter không cho điểm stun của shade.
- Sau mọi cập nhật: flames≤0→lost/no_flames; còn thời gian→playing kể cả tất cả sáng; hết giờ và `litCount≥ceil(0.6×total)`→won/dawn_survived, ngược lại lost/dawn. Bonus thắng =Σđèn đang sáng(50+floor(fuelUnits/60))+50×flames. Không bonus thời gian. Không dùng fuel đã làm tròn output để tính điểm.
- Manifest P3/P4 cập nhật cả tuning score cũ: per_mote=5, per_lantern=100 (lần đầu), per_stun=5 (cơ bản), per_second_left=0, per_flame_left=50; carry_capacity=10 là sức chứa khởi đầu, capacity_max=20. Điểm relight/drain/bonus đèn nằm trong ScoreRules và được test theo P3 §5, không để manifest còn số P2 gây hiểu sai.

## 4. Thứ tự tick

Snapshot tick0 sau mặc định+scenario, trước input; dựng scenario không gọi hàm cộng điểm/phát gameplay event. Bước k đọc input tick k, sự kiện bước đó ghi tick k+1; N ticks là tối đa N bước, dừng sớm nếu terminal. Từ v1.1 lifecycle runner phát night_start một lần ở tick0 sau snapshot0; đây không phải sự kiện do đặt lantern/mote bằng scenario. `tick` đếm cả pause, `sim_tick` chỉ đếm gameplay.

| Bước | v1.0 (lựa chọn cố định của dự án) | v1.1 (P2 bắt buộc) | v1.2/v1.3 |
|---|---|---|---|
| 1 | Áp sparse input và cạnh nút | Xử lý pause trước; paused/resumed theo cạnh lên | Giữ v1.1 |
| 2 | Giảm giờ/cooldown/invuln/stun/TTL | Thêm dash/charm/respawn/hồi bùa | Thêm hao+hút dầu từ drain đầu bước, clamp và tắt đèn ngay |
| 3 | Di chuyển/nhảy/collision rồi kiểm rơi | Thêm dash, bục phóng, gió, respawn | Giữ v1.1 |
| 4 | Nhặt đom đóm | Nhặt thêm bùa | Capacity động |
| 5 | Nạp đèn chưa sáng | Giữ | Chọn đèn nhận được: deposit/relight/refuel |
| 6 | Cập nhật safe/đẩy bóng | Giữ | Safe phụ thuộc fuel≥30 |
| 7 | Pulse: chốt mục tiêu, trừ carry, choáng/push | Thêm phản ứng drifter | Điểm dựa trạng thái trước pulse |
| 8 | Di chuyển Bóng Mực | Di chuyển thêm Gió Lạc | Thêm drain và chuyển trạng thái |
| 9 | Hit theo id, tối đa1 máu/tick | Gió Lạc cướp trước, shade hit sau | Giữ |
| 10 | Sinh theo lịch | Mote/shade/drifter; mới sinh chỉ tương tác tick sau | Giữ |
| 11 | flames0→lost; all_lit→won; hết giờ→lost | Giữ; all_lit thắng cả đúng tick hết giờ nếu sống | no_flames trước; hết giờ mới xét tỷ lệ; bỏ all_lit |
| 12 | Snapshot nếu tới chu kỳ | Giữ | Giữ |

Đang pause hoặc vừa vào pause: chỉ cập nhật input latch, tick và event pause/snapshot; dừng trước step2. Chọn khi resume thì chạy tiếp step2 trong cùng bước. Input gửi lúc pause vẫn cập nhật latch, không dồn pulse/dash/jump để kích hoạt khi resume. CLI vẫn có thể hết `--ticks` trong state paused. Nếu terminal, ghi event game_over đúng một lần rồi snapshot nếu tới lịch, end là dòng cuối.

Lịch dùng sim_tick sau bước, nên spawn300 xuất hiện ở trạng thái tick300 nếu không pause; chưa chạm/nhặt trong bước300. Mote rơi bởi hit cũng chỉ nhặt từ bước sau. Đom đóm đầu Đêm:20 điểm khác nhau, mỗi240 tick thử một điểm trống, dưới trần30; không có điểm hợp lệ thì bỏ lượt. Shade có2 con ở300 rồi mỗi480/420/360 tick theo Đêm1/2/3, cap6/8/10; vị trí hợp lệ cách player≥15, ngoài safe. Spawn random=false tắt lịch tương ứng; danh sách scenario thay danh sách mặc định tương ứng.

## 5. Headless CLI, schema và tính tất định

Sau build, manifest khai các lệnh không cần shell đặc thù:

```text
build_cmd: npm ci && npm run build
run_cmd: node dist/server/main.js
headless_cmd: node dist/cli/headless.js
bench_cmd: node dist/cli/bench.js       (từ v1.3)
soak_cmd: node dist/cli/soak.js         (từ v1.3)
```

CLI theo đúng nguồn: `--seed <int> --night <1|2|3> [--scenario file.json] [--inputs file.json] --ticks <int> --out file.jsonl [--snapshot-every <int>]`; v1.0 chỉ night1; snapshot-every mặc định10 và phải>0, ticks≥0. Hỗ trợ đường dẫn có khoảng trắng, không mở cửa sổ/GPU; chạy nhanh nhất có thể. Input mặc định move[0,0], yaw0, nút false. Frame tick phải nguyên không âm/tăng nghiêm ngặt; frame chỉ thay trường hiện diện; move mỗi thành phần[-1,1], chuẩn hóa độ dài>1; yaw dùng công thức P1 Contract C. Nút jump/interact/pulse và từ v1.1 dash/pause chỉ cạnh false→true.

Validate JSON/type/số hữu hạn/phạm vi của các trường có trong contract trước khi chạy; lỗi inputs/scenario hoặc tham số không hợp lệ→exit2 và stderr; IO/build/lỗi runtime→exit khác0, không che bằng end thành công. Thành công kết thúc do game hoặc ticks→exit0 và một end bắt buộc. Không có inputs nghĩa là đứng yên. Headless một lần chỉ chạy một Đêm, không tự chuyển Đêm sau khi thắng.

Scenario áp lên world mặc định: player override; motes/shades và từ v1.1 drifters/charms **thay** danh sách, mảng rỗng xóa; lanterns **patch theo id**, đèn không nhắc giữ nguyên. Cờ random và wind được áp trước khởi tạo lịch; shade liệt kê hoạt động ngay, không chờ spawning. Hỗ trợ toàn bộ trường P1 D/P2 Phần4/P3 §7; đặc biệt timers ticks, shade state/state_ticks_left, target_lantern_id, player successful_lights. P3 lit:true thiếu fuel→100; ever_lit mặc định true khi đã sáng, relit_count mặc định0, successful_lights mặc định0 kể cả đặt sẵn đèn sáng; capacity chỉ suy từ counter, không suy từ số đèn scenario. Dựng sẵn không phát mote_picked/deposit/lantern_lit/pulse hay thưởng điểm.

JSONL UTF-8, newline LF, không log lẫn vào file; thứ tự: snapshot0 → events theo bước/hệ thống/id → snapshot mỗi bội snapshot-every → end. Không bắt buộc thêm snapshot ngoài chu kỳ khi kết thúc. Tọa độ output làm tròn3 số lẻ, -0→0; các fuel trong snapshot/event v1.2 làm tròn1 số lẻ (giá trị JSON number, không cần giữ số0 thập phân). TTL vô hạn của random mote xuất `ttl_s:null` theo giả định vì nguồn không định dạng riêng. Serializer giữ thứ tự khóa và sắp mảng id ổn định; `end.ticks` là số bước thực chạy, không phải ticks yêu cầu khi thắng/thua sớm.

| Phiên bản | Trường/sự kiện public phải có |
|---|---|
| v1.0 | Snapshot: type,tick,sim_tick,state,time_left_s,score,player{pos,flames,carried},lanterns{id,pos,lit,deposited},shades{id,pos,state},motes_active; chọn xuất thêm motes{id,pos}. Events: mote_picked{carried}; deposit{lantern_id,amount,deposited}; lantern_lit{lantern_id}; pulse{stunned_ids}; player_hit{by,flames,dropped}; shade_spawned{id}; game_over{result,reason}. End{type,ticks,state,score}. |
| v1.1 | Thêm night,wind{active,dir_deg}; player vel/grounded/invuln/dash_cd_s/pulse_cd_s/charm_s; motes{id,pos,kind,ttl_s},drifters{id,pos,state,stolen},charms{id,available,respawn_s} bắt buộc. invuln là boolean. Events thêm dash{},charm_picked{charm_id,charm_ticks},drifter_steal{drifter_id,amount,carried},drifter_drop{drifter_id,amount},night_start{night},paused{},resumed{}; hit do fall thêm lost (số carry mất), dropped=0. |
| v1.2/1.3 | Lantern thêm fuel,ever_lit,relit_count; player capacity; shade có drain. Events refuel{lantern_id,amount,fuel},lantern_out{lantern_id},fuel_drain{lantern_id,shade_id,fuel},lantern_lit thêm relight boolean; game_over.reason dùng dawn_survived/dawn/no_flames. fuel_drain ghi mỗi mốc sim_tick chia hết60 cho shade thực hút trong step2, fuel là mức cuối step2 sau tổng hút; giả định cadence này được test. |

Tất định: chọn PRNG xorshift32 (dịch trái13, phải unsigned17, trái5; chốt uint32), seed0 ánh xạ 0x6d2b79f5, giá trị đều bằng uint32/2^32; không Math.random/Date.now trong sim. Seed int chuyển modulo2^32; RNG chọn từ danh sách ứng viên được sắp trước, cố định thứ tự gọi; không phụ thuộc thứ tự object/hash/async. Input ngẫu nhiên soak dùng PRNG riêng để không đổi chuỗi sim. RNG và counter reset đúng Đêm; id scenario không va id tự sinh. Không làm tròn pos nội bộ ở mỗi tick; dùng JS Number/cùng thứ tự phép tính và tích phân cố định, chỉ round khi serialize. Fuel/timer nguyên tránh sai số ngưỡng; scenario fuel quy đổi `round(fuel×60)`. Không timestamp/wall-clock/đo hiệu năng trong JSONL; renderer không tiêu RNG sim. Chạy hai lần trên cùng môi trường phải giống byte; CI thêm replay macOS/Linux để phát hiện lệch nền tảng, không tuyên bố đã đạt khi chưa thử.

## 6. Benchmark, soak, storage và gói chạy

Bench dùng Playwright Chromium bản được khóa cùng dependency; viewport nội dung1280×720, deviceScaleFactor1, có cửa sổ/không fullscreen, render thật. Cài browser là bước chuẩn bị riêng cho bench được ghi README/CI, không tăng số lệnh để **chơi game**. Thử launch cấu hình bỏ giới hạn frame/vsync mà Chromium hỗ trợ; không mặc định `vsync_off:true` chỉ vì truyền flag. Nếu không xác nhận được engine/OS đã tắt, ghi false và giải thích; P4 cho phép engine không tắt được. Ghi OS/GPU/renderer/version/cách chạy trong evidence; CI GPU phần mềm chỉ kiểm runner/schema, không chứng nhận ngưỡng máy chấm.

Cảnh bench cố định Đêm1: seed42, đúng200 shade wander rải đều trên đảo,100 mote, L1–L3 lit/fuel100; Mây(0,0,0). Tắt spawn/hit/pickup/fuel decay/game-over và phần sáng tạo, giữ wander bình thường/collision/safe/render/ánh sáng như chơi. Wander bench không chuyển chase khi gần Mây. Camera `x=30cosθ,z=30sinθ,y=15`, θ=2πt/15, nhìn origin; bắt đầu(30,15,0), chiều như P4. Warmup3 s rồi đo đúng duration giây, đóng browser/tiến trình exit0; seed/duration/out nhận từ CLI.

`frames=N`, `avg_fps=1000N/Σdt`; k=max(1,ceil(.01N)), p1_low_fps=1000/mean(k dt lớn nhất); frame_ms_p95 chọn phân vị nearest-rank `sort(dt)[ceil(.95N)-1]` (giả định). Chỉ đo interval nằm trong cửa sổ đo, không làm tròn dt trước tính; load_ms từ lúc khởi động runner tới khung đầu của cảnh đã sẵn sàng. Output đủ `contract_version,avg_fps,p1_low_fps,frame_ms_p95,frames,load_ms,peak_mem_mb,vsync_off,renderer,os`; RSS peak chỉ ghi nếu đo được phạm vi tiến trình đúng, bản web không đo được thì null + giải thích, không dùng JS heap thay RSS. Đích avg≥60/p1≥30/load≤10000 trên máy chấm.

Soak: một tiến trình Node, seed7/nights10/out; i=0…9, night=1+(i%3), seed=7+i. Mỗi30 gameplay tick chọn hướng mới (góc đều, vector đơn vị); mỗi tick lấy Bernoulli jump.05/dash.03/pulse.02/interact.10 từ PRNG input riêng. Đây là giá trị nút, cạnh lên vẫn do core xử lý; không gọi thẳng action để bỏ qua latch/cooldown. Chạy mỗi Đêm tới terminal hoặc đúng thời lượng chuẩn, ghi một result mỗi Đêm; sau mỗi Đêm reset/release references, không khởi process mới hay ép GC riêng để làm đẹp số. mem_start=RSS sau load Đêm đầu, mem_end=RSS sau reset cuối về trạng thái sẵn sàng tương đương; ghi duration_s thực, crashes và đủ10 results (ví dụ3 phần tử trong nguồn chỉ minh họa). Mục tiêu crashes0, end≤1.2start; thất bại vẫn giữ số đo và exit khác0.

Leaderboard: Node bind loopback, phục vụ web/API và file `data/leaderboard.json` theo thư mục dự án đã xác định, không phụ thuộc cwd ngẫu nhiên. Validate name `^[A-Za-z0-9_]{3,12}$`, score nguyên≥0, nights_won0…3, seed; server ghi achieved_at ISO UTC. Giữ top10, score giảm/achieved_at tăng, bằng timestamp giữ thứ tự nhận; ghi temp+rename và tuần tự hóa ghi để không mất điểm. API hiển thị lỗi nếu không ghi được; localStorage chỉ là chế độ dự phòng có báo rõ, không âm thầm gộp hai bảng. `node dist/server/main.js --export-leaderboard out.json` chỉ đọc cùng file, xuất `{entries:[...]}` đúng thứ tự, exit0 không mở server. Test chuẩn dùng server, restart thật và CLI export; dữ liệu fallback trong browser không được mạo nhận đã xuất bởi CLI.

Gói chạy từ clone: `npm ci` → `npm run build` → `npm start`; npm start chạy server trên loopback và in URL. Manifest run_cmd dùng Node trực tiếp để tham số export không bị npm nuốt. Release chính `dao-den-long-web-local.zip` gồm dist web/CLI/server, package+lockfile, hướng dẫn và mọi thành phần cần chạy Node trên macOS/Linux; có thể kèm ZIP web tĩnh phụ dùng fallback, nhưng web tĩnh đơn thuần chưa đủ bằng chứng full leaderboard/export. Không cần compiler/native runtime ngoài Node đã ghi yêu cầu; benchmark browser cài khi chạy bench. Credits liệt kê primitive, WebAudio, dependency/công cụ AI dù không có asset bên ngoài.

## 7. Kiểm thử, regression và tự động kiểm chứng

| Lớp | Bộ kiểm tối thiểu |
|---|---|
| Unit | Cam-yaw/normalize/edge-latch; gravity/ground/sweep; tick timers; tie-id; score; RNG; fuel integer/ceil/cap/out/safe30/capacity; win precedence; leaderboard validate/sort. Dùng giá trị mong đợi tính từ yêu cầu, không gọi lại hàm triển khai để tạo oracle. |
| Headless P1 | Mỗi event chuẩn; carry full; pickup radius biên; nạp nhiều lần/tie; all_lit và dawn cùng tick; hit+invuln/drop/TTL; pulse insufficient/cooldown/stunned; safe eject; no_flames/fall; scenario không điểm/event thưởng; tick0/N/invalid inputs. |
| Headless P2 | Ít nhất1 scenario từng tính năng mới: jump/dash cooldown12/90, air dash/launch, fall/respawn, pause/sim_tick/spawn; cầu/dốc/vách/tầng/bục/gió; drifter từng nhánh cướp/pulse/drop/TTL; charm/re-pick/respawn; height khác tầng; tương tác nhiều địch theo id. |
| Headless P3 | Fuel29.983/30/30.017, decay+multi-drain, out trước interact cùng tick, refuel đầy/thiếu/ceil, relight5/ever_lit, điểm drain15, capacity cap20/reset; không thắng sớm; dawn đủ/thiếu và flame0 đúng tick cuối; bonus floor fuel. |
| Tất định | Hai lần CLI cùng seed/scenario/sparse inputs so file byte-for-byte (kể cả id/event); lặp có random spawn/drop/wind/pause; cùng input browser ghi lại chạy CLI và so các snapshot sim, không so hình. |
| Regression | P2 giữ P1 với số chuẩn; P3 giữ movement/pickup/hit/pulse/geometry/schema cũ còn hiệu lực, thay test all_lit/duration/score/deposit-only/safe cố định/capacity cố định. Mỗi test sửa/xóa có ID nguồn và lý do trong changelog, không skip âm thầm. P4 chạy lại P1–P3 phần còn hiệu lực + schema v1.3/bench/soak. |
| Browser và release | Checklist các gate P2 Phần3, P3 màu/dầu, P4 remap/caption/motion/font; chơi đủ3 Đêm và retry; restart/export storage; clean clone3 lệnh; ảnh/video thật; bench/soak artifact thật. |

`npm test` chạy unit+scenario+determinism bằng một lệnh, không cần GPU/network sau install. `npm run verify` chọn phase theo manifest, chạy typecheck/build/test và validate schema/tuning, xuất `docs/evidence/phase-N/verification.json` + trace/test log với commit, hash nội dung đang xét, contract, lệnh/exit/time/môi trường; gate browser chưa thử ghi chưa đạt. Performance/soak P4 chạy bằng lệnh riêng khi đủ môi trường, không làm unit phụ thuộc GPU.

CI mỗi push/PR: install bằng lockfile, build/typecheck/test/manifest check trên Linux; smoke macOS cho CLI/lệnh chạy, upload report/log/JSONL; không giả pass vì thiếu GPU. P4 release job chạy schema+soak; benchmark thực trên máy phù hợp kèm cấu hình và kết quả (CI phần mềm chỉ smoke). Báo cáo không thay output của giảng viên; không gọi test ẩn là đã pass.

Agent Stop hook được đăng ký thật trong harness từ ticket01: gọi cùng verify (hoặc dùng report xanh chỉ khi hash nội dung/phase trùng); missing/stale report hoặc exit khác0 phải block Stop với lệnh lỗi và log. Chống hook tự gọi lặp bằng cơ chế của runner; không dùng cờ bypass làm đường hoàn thành mặc định. Thử hook bằng một assertion sai tạm thời rồi khôi phục: lưu evidence Stop bị chặn khi đỏ và cho qua sau xanh. Gate tag/release còn yêu cầu checklist/browser/perf bắt buộc và review độc lập; unit xanh không tự chứng minh UI. AGENTS hướng dẫn ngắn các lệnh/rules, cập nhật P2/P3/P4; giữ lịch sử hook/skill. Reviewer là người hoặc agent khác writer, ưu tiên người khi quota thấp; worker SPEC này không tạo reviewer con.

Mỗi phase có Evaluation ngắn: gate đạt/chưa đạt và artifact, regression, lỗi AI và cách tìm, chi phí/token ước tính, việc còn lại. Chỉ gắn tag khi report khớp mã và danh sách chưa đạt trung thực; không sửa tay bench/soak, không lấy ảnh tag khác. Các deliverable này là kế hoạch, **chưa được thực thi bởi tài liệu SPEC**.

## 8. Điểm còn mở và giả định đã chọn

Không cần chờ làm rõ để triển khai theo các lựa chọn dưới đây; nếu giảng viên trả lời khác thì cập nhật ADR/test/tài liệu trước gate, giữ dấu vết thay đổi.

| Điểm mơ hồ / phản biện | Chọn cho dự án |
|---|---|
| Số chuẩn có nên đợi P2? | Dùng sớm cho cơ chế P1 đã có là hợp lệ vì v1.0 cho tự điền tuning. Không đưa dash/pause/schema1.1 hoặc fuel/win1.2 vào tag1.0. |
| Ông Đăng có đủ là sáng tạo? | Không: lời dẫn đã bắt buộc P2. Thêm màn múa rối trang trí riêng, tắt headless/bench/soak; không thay lời dẫn bắt buộc bằng placeholder. |
| “Vsync off” trên browser có chắc? | Là mục tiêu cấu hình, không phải sự thật được suy từ flag. Chỉ ghi true khi xác nhận; nếu không hỗ trợ ghi false/README như P4 cho phép. Không ép số đo đạt. |
| ZIP web tĩnh với leaderboard đĩa/export | Gói đầy đủ kèm server Node; bản web tĩnh phụ dùng localStorage nhưng không coi đó là nghiệm thu CLI export cùng bảng. |
| Bóng wander/spawning chưa mô tả đủ ở P1/P2 | Wander hướng tới đèn tắt gần nhất, không có thì đi tới waypoint seeded; spawning sinh theo lịch dùng30 tick không hit rồi wander (scenario shade mặc định hoạt động ngay). Wander→chase≤12, chase→wander>18; quay về wander khi hết stun. Giữ lựa chọn và fixture; không đổi số bắt buộc. |
| “Mỗi tick hút”, ghi fuel_drain mỗi60 | Chọn drain trạng thái đầu bước, event ở sim_tick chia hết60; ghi rõ để không nhầm timer render/pause. |
| Thời điểm gió/bùa/hồi sinh | Gió Đêm3 bắt đầu sim_tick1800, kéo300 tick, cảnh báo từ1680; lặp1800. Respawn bùa đếm2700 từ lúc nhặt. Thời gian chờ respawn kết thúc khi bộ đếm về0 ở step2. |
| Trần mote30 và mote rơi | Lịch random chỉ sinh khi tổng active<30, không xóa mote rơi để cưỡng ép trần; dropped không chiếm slot của điểm sinh random, TTL480 và nhặt từ tick sau. TTL random=null ở JSON. |
| Đêm3 xuất phát ở origin nằm dưới tầng2 | Giữ (0,0,0) theo contract, tầng0 vẫn có sàn dưới nền nâng; không snap lên Y6. Trụ tháp chỉ chiếm Y6…14; test đi ra từ dưới tầng, render không làm tầng vô hình. |
| i của seed soak / phân vị95 / input xác suất | i bắt đầu0; nearest-rank p95; Bernoulli sinh giá trị nút mỗi tick, hướng đều đổi mỗi30. Dùng PRNG input tách sim, document để tái chạy. |
| Điểm khi thua / tie leaderboard | Chỉ tổng Đêm đã thắng, không cộng Đêm đang thua; achieved_at do server ghi ISO UTC, cùng timestamp giữ thứ tự nhận. Không cần tên Unicode để đạt. |
| UI pause/reduce motion | Resume chạy gameplay trong cùng tick; khi paused tiêu input latch, không dồn action. Giảm chuyển động tắt rung/chớp toàn màn, vẫn giữ thanh dầu/chỉ báo tĩnh và cảnh báo cần thiết. |

## Phan bien ticket

Chỉ đề xuất thay dependency/split; **không sửa 16 file ticket**.

| Ticket | Điều chỉnh đề nghị và lý do |
|---|---|
| 01 / 05 | Chuyển nền CI, verify và Stop hook có test đỏ/xanh sang01;05 chỉ hoàn thiện evidence/review/tag. Nếu hook chỉ có cuối05 thì writer đã làm gần hết P1 không được chặn test đỏ. |
| 02 / 04 / 06 | Tách phần movement/terrain tối thiểu Đêm1 (jump7, gravity−20, ground/collision/fall) vào01 hoặc ticket con trước04. Hiện04 nói chơi P1 hoàn chỉnh nhưng jump mới được06 nêu; P1 §2 đã bắt buộc nhảy. Chọn fall bật sớm và khai tuning đúng. |
| 04 | Giữ bắt đầu sau01 cho scaffold render; nghiệm thu “chơi từ đầu tới thắng/thua” phải chờ02+03. Phân biệt dependency khởi công và gate tích hợp, không coi screenshot scaffold là xong. |
| 06 / 07 | 06 có thể dùng fixture map2–3 nội bộ, chỉ đánh dấu hoàn tất contract sau khi07 xong; thêm kiểm geometry/launch/wind và regression P1. Không để chữ “có thể stub” lọt qua gate09/tag2. |
| 08 | Có thể bắt đầu sau06 với scenario inject, nhưng test vị trí charm, spawn và render cuối cần07. Ghi07 là dependency nghiệm thu, tránh AI tự nghĩ tọa độ tạm là chuẩn. |
| 09 | Chia09a flow/UI/settings/audio sau06 (song hành việc07/08 nếu có người làm),09b integration/evidence/tag sau07+08+09a. Bổ sung từng acceptance P2 Phần3 theo PRD, Evaluation/review/harness và số đo FPS thật. Không cần agent song song để áp dụng cách chia này. |
| 10 / 11 | 10 giữ sau09; tách test-first fuel/win/score khỏi glue UI. ADR quyết định mô hình và bảng test thay/bỏ bắt đầu ở10,11 chốt trình bày/UI/changelog; viết ADR sau code dễ che mất thay đổi luật. |
| 12 / 16 | Đưa khai báo manifest v1.3/bench_cmd/soak_cmd dùng cho runner sang đầu P4, thay vì đợi16;12 runner sau11 nhưng cảnh/render helpers có thể chuẩn bị sớm. Sửa tiêu chí “tắt vsync” thành cố gắng tắt + báo đúng khả năng engine; phải đủ công thức/cảnh/warmup/đóng process và environment. |
| 13 | Giữ core dependency10, gate cuối cần11/bản gameplay P3 hoàn chỉnh. Nêu rõ i=0, đủ10 results, điểm đo RSS sau reset, cùng process; không gộp khởi process mỗi Đêm. |
| 14 | Sau09 đủ làm storage, nhưng nghiệm thu tổng điểm cần10 và release export cần server/package của01/16. Tách adapter file/API/export khỏi UI, thêm restart/export cùng dữ liệu; fallback không thay server gate. |
| 15 | Chia remap/subtitle/motion/font sau09, integration sau11 vì low-fuel/mù màu đến P3. Checklist phải có mũi tên spawn, cảnh báo gió/10s/dầu yếu và reload; không chỉ một checkbox tổng. |
| 16 | Giữ phụ thuộc12–15; thêm11 rõ ràng nếu DAG cho phép13/14/15 bắt đầu sớm. Chuẩn bị package/README/demo/retro xuyên phase, cuối16 chỉ chốt clean clone/evidence/review/tag/Release; gói đầy đủ phải có server Node thay vì chỉ web tĩnh. |

Không có ticket nào được miễn yêu cầu Evaluation, bằng chứng khớp tag, reviewer độc lập hoặc quota reserve. Đề xuất trên giảm dồn việc ở ticket release; không mở rộng game ngoài bốn phase.
