# 02: Đom đóm, nạp và thắp đèn, điểm, thắng/thua theo giờ

**Phase:** P1

**What to build:** Đom đóm sinh trên các điểm Đêm 1, nhặt tự động trong pickup_radius, sức chứa; tương tác nạp vào đèn gần nhất chưa sáng; thắp đèn; điểm; thắng all_lit, thua dawn; scenario cho player/motes/lanterns/time_left.

**Blocked by:** 01

**Status:** ready-for-agent

Nguồn yêu cầu: `docs/requirements/Phase*.md`. Thuật ngữ: `GLOSSARY.md`.

- [ ] Sự kiện mote_picked, deposit, lantern_lit, game_over đúng dữ liệu
- [ ] Scenario không phát sự kiện, không cộng điểm
- [ ] Có scenario headless cho nhặt, nạp nhiều lần, thắng all_lit, thua dawn
