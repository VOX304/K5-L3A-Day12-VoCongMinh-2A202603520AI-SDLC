# 13: Soak test

**Phase:** P4

**What to build:** soak_cmd chạy headless 10 Đêm trong một tiến trình, input ngẫu nhiên theo seed, đo RSS đầu/cuối, ghi soak.json.

**Blocked by:** 10

**Status:** ready-for-agent

Nguồn yêu cầu: `docs/requirements/Phase*.md`. Thuật ngữ: `GLOSSARY.md`.

- [ ] crashes = 0 và mem_end ≤ 1.2 × mem_start
- [ ] soak.json tự chạy được commit
