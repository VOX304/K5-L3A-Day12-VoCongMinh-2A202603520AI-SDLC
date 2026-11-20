# Glossary — Đảo Đèn Lồng

Thuật ngữ miền của game. Tên tiếng Việt là tên trong game; tên tiếng Anh là tên dùng trong Test Contract và code.

| Thuật ngữ | Contract / code | Nghĩa |
|---|---|---|
| Mây | `player` | Nhân vật người chơi, người giữ đèn nhỏ tuổi. |
| Đom đóm | `mote` | Đốm sáng nhặt được, mang theo để nạp vào đèn. Có hai loại: `random` (sinh theo lịch) và `dropped` (rơi ra khi bị đánh hoặc Gió Lạc thả lại, có TTL). |
| Đang mang | `carried` | Số đom đóm Mây đang giữ, không vượt Sức chứa. |
| Sức chứa | `capacity` | Số đom đóm tối đa Mây mang được. Từ Phase 3 tăng theo số lần thắp thành công. |
| Đèn Lồng Lớn | `lantern` | Mục tiêu trên đảo, id `L1…Ln`. Thắp bằng cách nạp đom đóm. |
| Nạp | `deposit` | Đưa đom đóm vào một đèn chưa sáng. |
| Thắp | `lantern_lit` | Đèn chuyển sang sáng khi đủ đom đóm. Thắp lần đầu khác Thắp lại (`relight`, đèn từng sáng). |
| Dầu | `fuel` | (Từ Phase 3) Nhiên liệu của đèn đang sáng, 0–100, hao theo thời gian. |
| Châm dầu | `refuel` | (Từ Phase 3) Nạp đom đóm vào đèn đang sáng để tăng dầu. |
| Đèn tắt vì cạn dầu | `lantern_out` | (Từ Phase 3) Đèn hết dầu chuyển về tắt, nhớ `ever_lit`. |
| Vùng an toàn | `safe_radius` | Vùng quanh đèn đang sáng mà Bóng Mực không vào được. Từ Phase 3 mất khi dầu < 30. |
| Bóng Mực | `shade` | Kẻ địch chính, id `S1, S2…`. Trạng thái: `spawning`, `wander`, `chase`, `recoil`, `stunned`, (Phase 3) `drain`. |
| Hút dầu | `drain` / `fuel_drain` | (Từ Phase 3) Bóng Mực đứng cạnh đèn yếu và rút dầu. |
| Gió Lạc | `drifter` | (Từ Phase 2) Kẻ địch cướp đom đóm, id `D1…`. Trạng thái `idle`, `chase`, `flee`, `removed`. |
| Bùa Gió | `charm` | (Từ Phase 2) Vật phẩm tăng tốc và bỏ hồi chiêu Lướt, id `C1…`. |
| Ngọn Lửa | `flames` | Máu của Mây, 3 mỗi Đêm. Hết thì thua (`no_flames`). |
| Tỏa Sáng | `pulse` | Kỹ năng tốn đom đóm, làm choáng và đẩy lùi Bóng Mực trong bán kính. |
| Lướt | `dash` | (Từ Phase 2) Di chuyển nhanh ngắn có hồi chiêu. |
| Bất tử | `invuln` | Khoảng thời gian sau khi bị đánh mà Bóng Mực không gây sát thương. |
| Đêm | `night` | Một màn chơi: Đêm 1 Đảo Bến, Đêm 2 Đảo Cau, Đêm 3 Đảo Chuông. |
| Bình minh | `dawn` | Hết thời lượng Đêm. Ở Phase 1–2 hết giờ là thua (`dawn`); từ Phase 3 sống sót tới bình minh với đủ đèn sáng là thắng (`dawn_survived`). |
| Tick | `tick` | Một bước 1/60 giây. `sim_tick` chỉ đếm bước gameplay (không tính lúc tạm dừng). |
