# 01: Bộ khung + headless tracer

**Phase:** P1

**What to build:** Repo TypeScript (Vite + Three.js cho browser, Node cho headless). Lõi mô phỏng tất định tách khỏi render. Headless CLI theo Test Contract v1.0: đọc --seed/--night/--scenario/--inputs/--ticks/--out/--snapshot-every, Mây di chuyển theo inputs (cam_yaw, chuẩn hóa vector, tốc độ 6 m/s), ghi snapshot + dòng end. game.contract.json, CI chạy test.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

Nguồn yêu cầu: `docs/requirements/Phase*.md`. Thuật ngữ: `GLOSSARY.md`.

- [ ] `npm ci && npm run build` rồi headless chạy được trên Linux/macOS
- [ ] Mô hình tick đúng: snapshot tick 0 trước input, N bước, sự kiện ghi tick=k+1
- [ ] Inputs sparse, trường vắng giữ giá trị, tick không tăng nghiêm ngặt hoặc JSON sai → exit 2
- [ ] Chạy 2 lần cùng seed/scenario/inputs → output giống hệt byte
- [ ] CI chạy `npm test` mỗi push
