# Đảo Đèn Lồng · Đêm 1

Thắp đủ năm đèn trước bình minh để thắng.

Chạy với Node.js **22.12+** (CI dùng Node 24), trên Windows/macOS/Linux:

```sh
npm ci
npm run build
npm start
```

Mở địa chỉ Vite in trên terminal. Điều khiển: **WASD / phím mũi tên** để đi, **Space** nhảy, **E** nạp đom đóm, kéo chuột trái để xoay camera. Nhân vật dạng capsule có nón, đứng trên đảo tròn bán kính 40 m. Tốc độ là 6 m/s; input chéo được chuẩn hóa.

Headless sau build (không cần cửa sổ/GPU):

```sh
node dist/headless/cli.js --seed 42 --night 1 --scenario examples/scenario.json --inputs examples/inputs.json --ticks 240 --snapshot-every 60 --out trace.jsonl
```

Hoặc chạy trực tiếp TypeScript: `npm run headless -- --seed 42 --night 1 --ticks 120 --out trace.jsonl`. Kiểm thử bằng `npm test`; gate hoàn tất là `npm run verify` (build, test, so sánh byte hai lần chạy CLI đã biên dịch).

Ví dụ nhảy và đổi hướng trên không (giữ Space qua lúc đáp không nhảy lại):

```sh
node dist/headless/cli.js --seed 42 --night 1 --inputs examples/jump-inputs.json --ticks 63 --snapshot-every 21 --out jump.jsonl
```

Đỉnh nhảy ở tick 21: `[0,1.225,2.1]`; đáp ở tick 42: `[2.1,0,2.1]`. Replay trong verify kiểm riêng di chuyển, nhảy và rơi/hồi sinh; CI chạy cùng gate trên Linux/macOS.

`--seed`, `--night`, `--ticks`, `--out` là bắt buộc; `--night` chỉ nhận 1. `--ticks` nhận số nguyên không âm, `--snapshot-every` nhận số nguyên dương (mặc định 10); seed nhận số nguyên an toàn có dấu. `--scenario` và `--inputs` là tùy chọn. Lỗi tham số, JSON, schema hoặc tick input không tăng nghiêm ngặt trả exit **2**, thông báo ra stderr; lỗi ghi file trả exit **1**. CLI không in log ra stdout và kiểm tra hết input trước khi tạo output. Thư mục chứa `--out` phải tồn tại.

`src/sim` là lõi thuần, không import DOM, Node hay Three.js; `src/headless` lo validation/IO; `src/web` chỉ lấy input, bước mô phỏng và render. Browser dùng bộ tích lũy thời gian cho bước cố định 1/60 s, headless chạy nhanh nhất có thể. Tick và PRNG dùng số nguyên, tọa độ giữ độ chính xác trong mô phỏng và chỉ làm tròn 3 chữ số lúc tạo snapshot.

Snapshot tick 0 được ghi sau scenario, trước input tick 0. Bước k đọc input tick k rồi tăng tick lên k+1; event ghi k+1 trước snapshot cùng tick. Trường input vắng mặt giữ giá trị; nút chỉ có cạnh nhấn khi false → true. Snapshot xuất ở tick 0, N, 2N… theo `--snapshot-every`; không tự thêm snapshot cuối nếu không đúng chu kỳ. Dòng cuối luôn là `end`, kể cả khi `--ticks 0`. `sim_tick` bằng tick. Thời gian được tính từ thời gian ban đầu trừ tick/60; bình minh dừng mô phỏng với `game_over`/`dawn` rồi `end`.

Tất cả tuning nằm ở [src/sim/tuning.ts](src/sim/tuning.ts). `npm run contract` (cũng chạy trong build) sinh [game.contract.json](game.contract.json). Kiểm thử phát hiện contract đã commit lệch tuning. Số liệu đang dùng từ Ticket-02: tốc độ 6 m/s, đảo 40 m, thời gian 300 s, 3 Ngọn Lửa, nhảy 7 m/s và trọng lực −20 m/s². Mỗi đèn cần 10 đom đóm và giữ tiến độ giữa các lần nạp.

## Điểm số

Mỗi đom đóm nạp vào đèn được 10 điểm. Mỗi đèn vừa thắp được thêm 100 điểm. Khi thắng, cộng thêm `2 × floor(giây còn lại) + 50 × số Ngọn Lửa còn lại`.

Vật lý: nhảy chỉ khi grounded và có cạnh nhấn, điều khiển ngang đầy đủ trong không khí. Tích phân Y theo gia tốc không đổi trong mỗi tick (`y += vy/60 + gravity/(2×60²)`), tiếp đất khi cắt Y=0 từ trên xuống trong đảo; không kéo người dưới mặt đảo lên sàn. Đi qua bán kính 40 thì rơi. Khi Y < −10, bỏ qua bất tử: mất 1 Ngọn Lửa và toàn bộ đồ mang; event v1.0 ghi `player_hit {by:"fall",flames,dropped:0}` (không sinh đồ rơi, không thêm trường `lost`). Người còn sống chờ đúng 60 tick, đứng yên, rồi hồi sinh ở origin với vận tốc 0 và bất tử 90 tick. Hết lửa thì thua ngay, lý do `no_flames` ưu tiên hơn `dawn`. Sai số 1e−12 ở so sánh mép đảo/mặt sàn/ngưỡng rơi tránh kích hoạt sớm vì sai số dấu phẩy động.

Tài liệu gốc ở [docs/requirements](docs/requirements) và [GLOSSARY.md](GLOSSARY.md). [AGENTS.md](AGENTS.md) và Stop hook trong `.claude/settings.json` yêu cầu verify đạt trước hoàn tất; hook dùng [quy ước exit 2 chính thức của Claude Code](https://code.claude.com/docs/en/hooks#exit-code-2-behavior-per-event) để chặn khi verify lỗi. Test harness kiểm cả nhánh xanh/đỏ bằng project tạm, không sửa source hoặc bỏ qua lỗi thật.

Sáng tạo của tôi: hình capsule đội nón và ánh sáng ấm đi theo Mây; chỉ là render, không đổi trace. Các mesh tạo bằng hình học Three.js, không dùng asset ngoài. Xem [CREDITS.md](CREDITS.md) và bằng chứng [docs/evidence/ticket-01.md](docs/evidence/ticket-01.md).

---

# Day 12 — AI SDLC: Đảo Đèn Lồng

> **Cá nhân** (1 người / 1 MSSV) · Áp dụng SDLC cùng AI để xây một **game 3D** qua **4 phase**, từ yêu cầu ban đầu tới bản phát hành.
> **Lab board + trợ giảng:** **[Đảo Đèn Lồng Lab](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW)**

---

## Tài liệu của lab

| File | Nội dung |
|---|---|
| [GUIDE.md](GUIDE.md) | Hướng dẫn làm lab: vòng làm việc mỗi phase, harness, kiểm chứng, token |
| [CHECKPOINTS.md](CHECKPOINTS.md) | Các mốc tự kiểm tra từ chuẩn bị đến nộp bài |
| [SUBMISSION.md](SUBMISSION.md) | Đặt tên repo, hạn nộp, tag, Release, video, checklist |
| [RULES.md](RULES.md) | Quy định: AI, trung thực về bằng chứng, bản quyền, bảo mật |
| [RUBRIC.md](RUBRIC.md) | Thang điểm chi tiết |

## Lab board

Yêu cầu dự án được phát hành tại **[Đảo Đèn Lồng Lab](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW)**. Mỗi phase là một tab (tab chưa phát hành bị khóa), mỗi tab có trợ giảng AI riêng chỉ trả lời trong phạm vi phase đó. Trợ giảng cần đăng nhập claude.ai và dùng lượt Claude của bạn.

## Dự án

**Đảo Đèn Lồng**: game 3D góc nhìn thứ ba. Mây, người giữ đèn nhỏ tuổi, gom đom đóm để thắp lại các Đèn Lồng Lớn và né Bóng Mực trong sương đen.

- Không ràng buộc công nghệ; chạy được trên macOS hoặc Linux.
- Tuân theo **Test Contract** (chế độ headless) để được chấm tự động và so sánh với nhau.

| Phase | Bạn nhận | Nộp |
|---|---|---|
| 1 | **PRD-0** (mô tả tổng quát) + Test Contract | tag `phase-1` |
| 2 | **Ticket-02**, phát hành khi Phase 1 kết thúc | tag `phase-2` |
| 3 | **Ticket-03**, phát hành khi Phase 2 kết thúc | tag `phase-3` |
| 4 | **Ticket-04**, phát hành khi Phase 3 kết thúc | tag `phase-4` + Release `v1.0.0` |

Yêu cầu sẽ được bổ sung và có thể thay đổi giữa các phase, giống dự án thật.

### Lịch 4 giờ

Bài lab kéo dài **4 giờ**. Phase 1 và 2 khoảng **1 giờ**, Phase 3 khoảng **30 phút**, Phase 4 khoảng **1 giờ 30 phút**. Mỗi phase phát hành đúng mốc giờ. Phase mới xuất hiện trên lab board khi tới mốc.

| Mốc | Sự kiện | Hạn tag |
|---|---|---|
| 0h | Phát hành **Phase 1** (PRD-0), gồm cả phần chuẩn bị | `phase-1` trước mốc 1h |
| 1h | Phát hành **Phase 2** | `phase-2` trước mốc 2h |
| 2h | Phát hành **Phase 3** | `phase-3` trước mốc 2h30 |
| 2h30 | Phát hành **Phase 4** | `phase-4`, Release `v1.0.0` và video trước mốc 4h |
| 4h | Hết giờ lab, chốt bài | |

Hết giờ mỗi phase thì tag và chuyển sang phase tiếp theo, dù phase chưa hoàn hảo. Chỗ chưa xong ghi trung thực trong bằng chứng.

---

## Gợi ý SDLC (cách làm là của bạn)

Mỗi phase là một vòng nhỏ. Công cụ, thứ tự, định dạng tài liệu đều tự do; đây chỉ là gợi ý:

1. **Requirements:** biến yêu cầu thành tiêu chí nghiệm thu kiểm chứng được. Chỗ mơ hồ thì tự giả định và ghi lại.
2. **Plan:** nghĩ cách kiểm chứng **trước** khi để agent viết code.
3. **Build:** để agent viết, bạn điều phối và review.
4. **Verify:** chạy thật, kiểm tra hành vi thật. *Không có bằng chứng thì chưa xong*: "agent bảo chạy rồi" không phải bằng chứng.
5. **Evaluate:** cái gì đạt, AI sai ở đâu, harness (AGENTS.md, skill, hook) cần chỉnh gì.
6. **Release:** gắn tag.

## Ba điều cần nhớ

> Bạn được **tự do sáng tạo thêm** quanh phần lõi (nhân vật, cơ chế nhỏ, câu chuyện, hiệu ứng, âm thanh…). Sáng tạo gọn và không phá yêu cầu được tính điểm trong hạng mục F của [RUBRIC](RUBRIC.md); ghi mục "Sáng tạo của tôi" trong README của bạn.

- **Game tốt là game đúng yêu cầu của khách hàng**, không phải game phức tạp hay đẹp nhất. Làm đúng và chứng minh được là đúng trước, trau chuốt sau.
- **Cân nhắc kỹ quota token của bạn.** Đốt nhiều token không làm bài tốt hơn. Ngữ cảnh gọn, kế hoạch rõ, kiểm chứng sớm thường vừa rẻ vừa đúng hơn chạy agent liên tục.
- **Kiểm chứng là phần quan trọng nhất.** Bằng chứng (test, output headless, ảnh, số đo) đáng giá hơn lời mô tả.

---

## Bàn giao cuối cùng

Một **repo GitHub cá nhân, public**, gồm:

1. **Toàn bộ mã nguồn** của game qua 4 phase, tag `phase-1` … `phase-4`, Release `v1.0.0`.
2. **Video demo `.mp4` dưới 5 phút** (đính kèm Release `v1.0.0` hoặc `docs/demo/demo.mp4`, link ở đầu README): chơi thử và cho thấy bằng chứng game chạy đúng.
3. **Bằng chứng kiểm chứng** của từng phase (định dạng tự chọn).
4. **Harness AI đã dùng** (AGENTS.md / CLAUDE.md, skills, hooks, plugins…), giữ nguyên trong repo và lịch sử git.
5. **Ghi chép ngắn:** spec/giả định mỗi phase, nhật ký dùng AI (gồm token/chi phí ước tính), retro.

Không commit API key, token hay `.env`. Gửi link repo theo hướng dẫn của Coach.

## Đánh giá (100 điểm)

| Hạng mục | Điểm |
|---|---|
| Test tự động ẩn (headless, gồm kiểm tra lại phase trước) | 30 |
| Kiểm chứng & bằng chứng của bạn | 20 |
| Quy trình SDLC & harness AI | 15 |
| Evaluation & retro (gồm cách bạn dùng token) | 10 |
| Hiệu năng & ổn định | 10 |
| Chất lượng sản phẩm (đúng yêu cầu, chơi được) | 10 |
| Video demo | 5 |

## Quy định

- Dùng AI thoải mái; không sao chép repo của người khác.
- Bằng chứng phải thật: test luôn đạt hay output sửa tay là vi phạm.
- Nhân vật, bối cảnh là bản gốc của lab; asset bên ngoài chỉ dùng loại CC0/CC-BY/MIT hoặc tự tạo, ghi nguồn trong `CREDITS.md`.
