# PRD — Đảo Đèn Lồng

Trạng thái: chốt phạm vi để triển khai; chưa có bằng chứng sản phẩm đạt. Nguồn chuẩn: [Phase 1](requirements/Phase1.md), [Phase 2](requirements/Phase2.md), [Phase 3](requirements/Phase3.md), [Phase 4](requirements/Phase4.md), [RUBRIC](../RUBRIC.md), [RULES](../RULES.md), [GLOSSARY](../GLOSSARY.md). Ticket là cách chia việc, không thay yêu cầu. Thiết kế và giả định chi tiết nằm trong [SPEC](SPEC.md).

## Vấn đề và người dùng

Làm một game 3D chơi được trên laptop macOS/Linux: Mây thu đom đóm, giữ đèn sáng, tránh Bóng Mực. Bài cá nhân trong lab 4 giờ cần chứng minh đúng từng yêu cầu, kể cả khi luật đổi; phần đẹp hoặc phức tạp vượt yêu cầu không thay thế bằng chứng.

Người chơi dùng bàn phím/chuột trên trình duyệt desktop. Giảng viên cần clone, chạy tối đa ba lệnh và kiểm thử từng tag bằng CLI không GPU. Học viên cần hiểu được mã, giải thích quyết định và kiểm soát quota AI.

## Mục tiêu và giới hạn

- Hoàn thành bốn tag `phase-1`…`phase-4` với contract lần lượt `1.0/1.1/1.2/1.3`; bằng chứng thật gắn đúng mã, không ghi đạt khi chưa chạy.
- Dùng cùng lõi mô phỏng cho browser và headless; kết quả headless lặp lại giống từng byte; số chuẩn Ticket-02 được chọn ngay Phase 1 cho những cơ chế đã có.
- Tạo cảm giác đêm cổ tích, ánh vàng cam ấm, nguy hiểm tím đen; Mây có nón lá và đèn nhỏ; không máu me. Primitive Three.js và âm thanh WebAudio tự tạo đủ đáp ứng, không cần tải asset ngoài.
- Sáng tạo nhỏ: NPC Ông Đăng có màn múa rối bóng đèn giấy lúc giới thiệu Đêm, chỉ trang trí. Lời giới thiệu Ông Đăng là bắt buộc từ Phase 2; riêng màn múa rối mới là phần thêm. Tắt phần thêm trong headless, bench, soak; có mục “Sáng tạo của tôi” và bằng chứng lõi không đổi.
- Ngoài phạm vi: mạng nhiều người, tài khoản/cloud, mobile, physics engine, asset tải ngoài, AI hội thoại, màn chơi hoặc cơ chế vượt contract. Không làm trình giả lập mọi phiên bản luật trong bản cuối; lịch sử tag giữ hợp đồng cũ.

## Mức hoàn thành ở từng tag

| Tag | “Xong” nghĩa là | Chủ động chưa làm / được stub |
|---|---|---|
| `phase-1`, v1.0, mốc 1h | Đêm 1 đủ đi/nhảy/camera, nhặt/nạp/thắp, địch/hit/pulse/vùng an toàn, thắng all_lit hoặc thua, HUD và chơi lại; CLI, test, CI, hook, README ≤3 lệnh, Evaluation và bằng chứng | Chỉ Đêm 1; chưa dash, pause, Gió Lạc, Bùa Gió, nhiên liệu, leaderboard. Primitive đơn giản được phép; nhảy và vòng chơi đầy đủ không được stub. |
| `phase-2`, v1.1, mốc 2h | Cả ba bản đồ chuẩn có va chạm thật; mọi số chuẩn, kỹ năng và luật mới; chuỗi ba Đêm, UI/âm thanh/cài đặt đầy đủ; headless ≤30 s/21.600 tick; browser trung bình ≥30 FPS ở 1280×720 | Chưa dầu/relight/thắng bình minh và các tính năng chỉ thuộc P3/P4. Map 2–3 có thể là fixture tạm trong ticket 06, nhưng không được stub ở tag. |
| `phase-3`, v1.2, mốc 2h30 | Chạy ba Đêm theo luật giữ ≥60% đèn tới bình minh, dầu/hút dầu/thắp lại/sức chứa/điểm mới đúng; UI dầu và mù màu; ADR, breaking changelog, test thay đổi có lý do | Chưa benchmark/soak chuẩn và leaderboard/accessibility mở rộng P4. Các phần P1–P2 không bị thay thế phải hoạt động. |
| `phase-4`, v1.3, mốc 4h | Đạt benchmark/soak, leaderboard đĩa và export, accessibility, tài liệu/retro/video, tag và Release `v1.0.0`; clone sạch chạy được | Không có stub cho yêu cầu bắt buộc. `peak_mem_mb:null` chỉ khi web không đo được và có giải thích; thiếu phép đo khác là chưa đạt. |

Chất lượng tối thiểu ở mọi tag: không lỗi làm kẹt vòng chơi, snapshot/event đúng schema, tuning khớp mã, regression còn hiệu lực xanh, có test đơn vị và scenario riêng. Mọi placeholder nội bộ phải được gỡ trước gate của phase. Tag trước không bị di chuyển hoặc viết lại lịch sử; không xóa harness đã dùng (RULES §7).

## Gate nghiệm thu và truy vết

Các ID dưới đây dùng lại trong bảng bằng chứng `docs/evidence/phase-N/`: ID yêu cầu → test/checklist → lệnh → kết quả → artifact → commit/tag. Hiện tất cả gate là **chưa chạy**; tài liệu này không phải báo cáo test.

| Gate | Nguồn | Điều kiện và bằng chứng phải có |
|---|---|---|
| P1-GAME | P1 §1–3 | Chơi Đêm 1 từ đầu tới thắng/thua và chơi lại; đi, nhảy, camera, nhặt/nạp nhiều lần, Bóng Mực, hit, pulse, đèn an toàn, điểm và HUD. Scenario lõi + ảnh/video browser; kiểm kiểu Mây và đảo sáng dần. |
| P1-CLI | P1 Contract A–E | Manifest đúng tuning thực, build/run macOS/Linux; tick 0 trước input, sparse/rising edge, N bước, exit code, scenario không thưởng, JSONL/end và cùng seed giống byte. Unit + schema + hai lần replay. |
| P1-HANDOFF | P1 §4–6; RUBRIC B–D | Clone sạch ≤3 lệnh, README điều khiển/điểm/giả định/sáng tạo; harness và chặn test đỏ thật, CI, review độc lập, nhật ký AI, Evaluation, repo public và tag. |
| P2-NUM | P2 Phần 1, 4 | Tuning chuẩn và đúng thứ tự tick; jump/dash/fall/respawn/pause, id, lịch sinh, bán kính/độ cao và điểm. Test biên + đầy đủ 21.600 bước ≤30 s; regression P1 theo số chuẩn. |
| P2-MAP | P2 Phần 2 | Đúng tọa độ, điểm sinh, cầu, dốc/vách/tầng/tháp và bục phóng của từng đảo; gió 2 m/s, chu kỳ 30 s/5 s, báo trước 2 s. Scenario qua cầu, đáp đúng tầng/đảo, rơi và wind + ảnh từ browser. |
| P2-DRIFTER | P2 Phần 3: Gió Lạc | Chỉ Đêm 2–3, tối đa 2, lịch 1200 tick; idle/chase/flee/removed, cướp một lần, không trừ máu, không bị safe/invuln chặn, pulse khi chase/flee cho kết quả đúng. Scenario cho từng nhánh và event. |
| P2-CHARM | P2 Phần 3: Bùa Gió | Đúng vị trí; hiệu lực 600 tick, chạy 7.2, dash vẫn 14/12 tick và phải nhấn lại, hồi sau 2700; nhặt lại làm mới. Unit thời hạn + scenario + render. |
| P2-FLOW | P2 Phần 3: Chuỗi 3 Đêm | Menu → giới thiệu tên đảo/lời Ông Đăng → chơi → kết quả → Đêm kế; thắng Đêm 3 → Bình Minh/tổng điểm, thua → chơi lại Đêm đó, không cộng điểm thua. Playthrough/checklist. |
| P2-PAUSE | P2 Phần 3: Tạm dừng | Esc/P đóng băng gameplay; Tiếp tục/Chơi lại Đêm/Cài đặt/Về menu hoạt động; tick tăng, sim_tick và bộ đếm đứng. Scenario pause + checklist menu. |
| P2-SETTINGS | P2 Phần 3: Cài đặt | Âm lượng và độ nhạy chuột có hiệu lực và còn sau reload/khởi động lại. Kiểm bằng browser. |
| P2-AUDIO | P2 Phần 3: Âm thanh | Nhạc nền đêm; SFX nhặt/thắp/pulse/hit/jump/dash/thắng/thua/spawn/10 s cuối. Kiểm nghe sau thao tác mở khóa WebAudio, thử volume/mute. |
| P2-HUD | P2 Phần 3: HUD | Ngọn Lửa trái trên; mm:ss giữa trên, đỏ/nhấp nháy ≤30 s; đèn/điểm phải trên; thanh 10 ô dưới giữa; cooldown dash/pulse phải dưới; “E — Nạp ánh sáng (x/10)”; mũi tên đèn chưa sáng gần nhất khi ngoài màn hình. Ảnh các trạng thái + checklist. |
| P2-LOOK | P2 Phần 3: Bảng màu/ánh sáng; DoD | Màu chuẩn sai lệch mỗi kênh ≤10%, ambient = 0.15 + 0.55×lit/total; đêm/ánh sáng rõ; trung bình ≥30 FPS tại 1280×720, ghi máy/cách đo; tối thiểu một scenario mỗi tính năng mới; spec và harness cập nhật. |
| P3-FUEL | P3 §1–2, 7 | Dầu nguyên, refuel ceil/cap, out/reset, relight 5, ngưỡng safe đúng 30, wander→drain/chase/stunned, hút cộng dồn và event mỗi 60 tick; test biên + scenario trace. |
| P3-WIN | P3 §3–5 | Không thắng sớm; 240/270/300 s; cuối tick cần 3/5, 4/6, 5/7, no_flames ưu tiên; capacity tăng cả relight, reset mỗi Đêm; công thức điểm thay toàn bộ. Test đúng tick bình minh và score. |
| P3-UI-DOC | P3 §1, 4, 6, DoD | Thanh dầu và chớp 1 Hz khi <30, carried/capacity; mù màu lưu được, thân đèn tắt xẹp 20%/giấy rách và ký hiệu cảnh báo; ADR mô hình/luật thắng, changelog, danh sách test sửa/bỏ có lý do; regression phần chưa thay. |
| P4-BENCH | P4 §1 | Cảnh và phép đo chuẩn, 3 s warmup +30 s đo; `avg_fps≥60`, `p1_low_fps≥30`, `load_ms≤10000` trên máy chấm. `bench.json` do chạy thật được commit; ghi môi trường/vsync, không dùng số giả nếu máy hiện tại chưa đủ. |
| P4-SOAK | P4 §2 | 10 Đêm xoay vòng trong cùng tiến trình, input đúng xác suất/seed, RSS sau load đầu và sau reset cuối; crashes=0, end≤1.2×start; đủ 10 results, `soak.json` thật được commit. |
| P4-SCORE | P4 §3 | Sau Bình Minh hoặc thua nhập tên 3–12 [A-Za-z0-9_]; lưu đủ 5 trường, top10, score giảm/đạt trước ưu tiên; menu xem điểm, tắt mở còn; `<run_cmd> --export-leaderboard out.json` khớp dữ liệu đĩa. Integration test restart + export. |
| P4-A11Y | P4 §4 | Remap 4 hướng/jump/dash/interact/pulse/pause, phát hiện trùng/reset/lưu; chỉ báo spawn kèm hướng, gió sắp tới, 10 s cuối, dầu yếu; giảm chuyển động tắt rung/chớp màn; chữ ≥18 px ở 720p và ×1.25. Checklist từng dòng + ảnh/reload. |
| P4-RELEASE | P4 §5–7, DoD; RULES §1–10 | Manifest v1.3 có bench/soak; README đủ ảnh/hệ thống/lệnh/điều khiển/test/headless/bench/soak; CHANGELOG bốn phase, CREDITS cả công cụ AI, LICENSE; retro 1–2 trang, video .mp4 <5 phút xem không đăng nhập; Release chạy được, public, đúng hạn và regression P1–P3 còn hiệu lực. |

## Rủi ro và cách khống chế

| Rủi ro | Quyết định |
|---|---|
| Sai tick, sai thứ tự hoặc số thực dầu làm trượt test ẩn | Lõi fixed-step, dầu/timer nguyên; test biên trước khi thêm mỹ thuật; serializer theo contract tại tag. |
| Tầng/dốc/bục phóng làm kẹt hoặc đáp sai | Geometry dùng chung sim/render, test quỹ đạo và mép tầng; không tự snap lên tầng cao nhất. |
| Bench web phụ thuộc GPU/vsync/máy chấm | Runner chuẩn riêng dùng render thật; ghi cấu hình và trạng thái vsync thực, giữ ngưỡng chuẩn; optimize có số đo. |
| Web tĩnh không có CLI xuất bảng điểm đĩa | Gói phát hành đầy đủ gồm web + server Node cục bộ; ZIP web tĩnh chỉ là bản phụ. localStorage là fallback có báo trạng thái, không thay bằng chứng server/export. |
| Quota và hạn 4 giờ | Đi theo gate, dừng mở rộng; reserve thời gian cuối cho evidence/Release/video. Thiếu gì ghi chưa đạt, không bịa kết quả. |
| NPC trùng tính năng bắt buộc | Giữ lời Ông Đăng theo P2; phần múa rối là sáng tạo riêng, không gọi riêng lời dẫn là sáng tạo. |

## Kế hoạch thời gian, token và agent

P1 60 phút; P2 60 phút; P3 30 phút; P4 90 phút theo RULES §2. Mỗi phase dành khoảng 20% cuối cho verify/Evaluation/tag; Phase 4 chuẩn bị quay demo và đóng gói từ đầu khoảng thời gian của mình. Không commit thêm sản phẩm sau hết giờ lab.

Một học viên chịu trách nhiệm quyết định và giải thích. Worker SPEC này tự làm, không mở agent con. Khi triển khai: một writer ở mỗi phần; review độc lập trước tag do người học hoặc một agent khác writer thực hiện, tập trung diff và bằng chứng (RUBRIC B), không nhân đôi toàn bộ ngữ cảnh. Hook/test bắt đầu từ ticket 01, không chờ cuối phase.

Claude coordinator luôn giữ **ít nhất 30% quota**: trước mỗi dispatch ghi quota còn lại và ước tính chi phí; nếu chạm reserve thì chuyển sang checklist/người review và test cục bộ. Codex hiện khoảng **35% quota tuần còn lại**; đây là số quan sát, không phải 35% được phép tiêu hết. Không mở thêm worker vì tiện; chỉ giao phần có đầu ra và file ownership rõ. Ghi token/chi phí ước tính thực tế mỗi phase cùng sai sót AI và cách phát hiện trong Evaluation, tổng hợp retro; không tự ghi số ước tính thành số đo. Đọc nguồn một lần, dùng test tóm tắt và diff, chỉ đọc log lỗi liên quan.
