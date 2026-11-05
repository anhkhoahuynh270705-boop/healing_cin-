# Checklist 1: Bảo vệ dữ liệu cá nhân

**Văn bản áp dụng:**
- Luật Bảo vệ dữ liệu cá nhân 2025: Luật số 91/2025/QH15, hiệu lực 01/01/2026 ([thuvienphapluat](https://thuvienphapluat.vn/van-ban/Bo-may-hanh-chinh/Luat-Bao-ve-du-lieu-ca-nhan-2025-so-91-2025-QH15-625628.aspx), [bản đọc theo điều](https://hethongphapluat.com/luat-bao-ve-du-lieu-ca-nhan-2025.html))
- Nghị định 356/2025/NĐ-CP, hiệu lực 01/01/2026, **thay thế Nghị định 13/2023/NĐ-CP** ([tóm tắt EY](https://www.ey.com/vi_vn/technical/tax/tax-and-law-updates/nghi-dinh-so-356-2025-nd-cp-quy-dinh-chi-tiet-mot-so-dieu-va-bien-phap-thi-hanh-luat-bao-ve-du-lieu-ca-nhan))
- Nghị định 330/2026/NĐ-CP: xử phạt, hiệu lực 19/08/2026 (xem checklist 08)

> Nghị định 13/2023/NĐ-CP đã hết hiệu lực từ 01/01/2026. Code/tài liệu nào còn dẫn NĐ 13 thì cần cảnh báo cập nhật.
>
> Ghi chú "CHƯA XÁC MINH" nghĩa là nội dung có nguồn nhưng chưa tìm được số điều cụ thể. Khi báo cáo, chỉ ghi tên văn bản, không tự điền số điều.

## Miễn trừ cho đơn vị nhỏ (đọc trước khi audit mục D, E)

Điều 38 Luật 91/2025 (Điều 39 là quy định chuyển tiếp, không phải miễn trừ):
- Khoản 3: hộ kinh doanh và doanh nghiệp siêu nhỏ không phải thực hiện Điều 21 (lập hồ sơ đánh giá tác động xử lý dữ liệu, DPIA), Điều 22 (cập nhật hồ sơ đánh giá tác động, kể cả hồ sơ chuyển xuyên biên giới) và khoản 2 Điều 33 (chỉ định bộ phận/nhân sự bảo vệ dữ liệu).
- **Không miễn việc lập hồ sơ đánh giá tác động chuyển dữ liệu xuyên biên giới.** Nghĩa vụ này nằm ở khoản 2 Điều 20, không thuộc danh sách khoản 3 Điều 38. Chỉ được miễn nếu rơi vào khoản 6 Điều 20.
- Khoản 2: doanh nghiệp nhỏ và doanh nghiệp khởi nghiệp được chọn chưa thực hiện các nghĩa vụ trên trong 5 năm kể từ 01/01/2026.
- Trường hợp không được miễn do Chính phủ quy định chi tiết (khoản 4 Điều 38, xem NĐ 356/2025).
- Không được miễn nếu kinh doanh dịch vụ xử lý dữ liệu, xử lý dữ liệu nhạy cảm, hoặc xử lý dữ liệu số lượng lớn.

- Chưa rõ: NĐ 356/2025 xếp dữ liệu theo dõi hành vi trực tuyến vào nhóm nhạy cảm. Nếu vậy, site gắn Google Analytics/Facebook Pixel có thể bị coi là xử lý dữ liệu nhạy cảm và mất miễn trừ. Chưa thấy văn bản hướng dẫn cách hiểu này: ghi rõ trong báo cáo là cần hỏi người làm luật, không tự kết luận.

→ Với site của hộ kinh doanh, doanh nghiệp siêu nhỏ: mục E thường ⚪, trừ khi rơi vào các trường hợp không được miễn. Mục D (chuyển xuyên biên giới) vẫn áp dụng. Các mục A, B, C vẫn áp dụng.

## A. Chính sách & minh bạch
- [ ] Có trang chính sách bảo vệ dữ liệu cá nhân công khai, dễ tìm (thường ở footer). Trang này nêu rõ loại dữ liệu thu thập, mục đích, thời gian lưu trữ, bên thứ ba được chia sẻ.
- [ ] Nêu rõ quyền của chủ thể dữ liệu: được biết, xem, chỉnh sửa, xóa, hạn chế xử lý, khiếu nại (Điều 4 khoản 1 Luật 91/2025).
- [ ] Có kênh liên hệ cụ thể (email/form) để người dùng thực hiện các quyền trên. Cam kết đúng thời hạn xử lý theo Điều 5 NĐ 356/2025 ([toàn văn](https://vbpl.moj.gov.vn/TW/Lists/vbpq/Attachments/187276/ND.356.2025.doc)):
  - Phản hồi và hướng dẫn thủ tục: 2 ngày làm việc (mọi loại yêu cầu)
  - Rút đồng ý/hạn chế/phản đối xử lý: 15 ngày, 20 ngày nếu phải yêu cầu bên xử lý hoặc bên thứ ba ngừng xử lý; gia hạn 1 lần tối đa 15 ngày (khoản 2)
  - Xem/chỉnh sửa/cung cấp dữ liệu: 10 ngày, 15 ngày nếu cần bên xử lý hoặc bên thứ ba; gia hạn 1 lần tối đa 10 ngày (khoản 3)
  - Xóa dữ liệu: 20 ngày, 30 ngày nếu cần bên xử lý hoặc bên thứ ba; gia hạn 1 lần tối đa 20 ngày (khoản 4)
  - Gia hạn chỉ khi yêu cầu phức tạp, phải báo lý do cho người yêu cầu.
- [ ] Chính sách phân biệt dữ liệu cơ bản và dữ liệu nhạy cảm. NĐ 356/2025 mở rộng danh sách dữ liệu nhạy cảm, trong đó có dữ liệu theo dõi hành vi trên mạng xã hội/dịch vụ trực tuyến, thông tin tài khoản và thẻ ngân hàng, mật khẩu định danh điện tử (số điều CHƯA XÁC MINH).

## B. Sự đồng ý
- [ ] Xin đồng ý trước khi thu thập/xử lý. Sự đồng ý phải tự nguyện, rõ ràng, kiểm chứng được, tách riêng theo từng mục đích (Điều 9 Luật 91/2025).
- [ ] Im lặng hoặc không phản hồi không được coi là đồng ý (Điều 9 khoản 4 điểm d Luật 91/2025).
- [ ] Không dùng ô tích sẵn, không chỉ dẫn gây nhầm lẫn. Không gộp việc đồng ý xử lý dữ liệu vào việc đồng ý điều khoản dịch vụ (NĐ 356/2025, số điều CHƯA XÁC MINH).
- [ ] Lưu được thời điểm và nội dung người dùng đã đồng ý để kiểm chứng khi cần (NĐ 356/2025, số điều CHƯA XÁC MINH).
- [ ] Người dùng rút lại đồng ý được, bằng văn bản, kể cả dạng điện tử hoặc định dạng kiểm chứng được (Điều 10 khoản 2 Luật 91/2025).
- [ ] Không có điều khoản bắt người dùng từ bỏ quyền được hỏi ý kiến (căn cứ Điều 9 Luật 91/2025).
- [ ] Dữ liệu trẻ em: từ đủ 7 tuổi, việc công bố/tiết lộ thông tin đời sống riêng tư cần sự đồng ý của cả trẻ và người đại diện theo pháp luật (Điều 24 Luật 91/2025).

## C. Cookie & theo dõi (tracking)

Luật không có điều riêng về cookie (CHƯA XÁC MINH). Căn cứ gần nhất:
- Dữ liệu theo dõi hành vi trực tuyến nay thuộc nhóm dữ liệu nhạy cảm (NĐ 356/2025).
- Xử lý dữ liệu cho mục đích quảng cáo phải có đồng ý và phải có cách để từ chối nhận quảng cáo (Điều 28 Luật 91/2025).

Cần kiểm tra:
- [ ] Banner xin đồng ý xuất hiện **trước** khi nạp script không thiết yếu (Google Analytics, Facebook Pixel, TikTok Pixel...). Xem `TRACKING_CONSENT` trong kết quả `scan.sh` (giải thích ở `00-triage.md`).
- [ ] Từ chối cookie không thiết yếu mà vẫn dùng được chức năng chính của site.
- [ ] Liệt kê các bên thứ ba nhận dữ liệu qua cookie/SDK trong chính sách.

## D. Chuyển dữ liệu xuyên biên giới

Mục này áp dụng cả với hộ kinh doanh, doanh nghiệp siêu nhỏ (khoản 3 Điều 38 không miễn khoản 2 Điều 20). Kiểm tra các trường hợp miễn ở khoản 6 Điều 20.

- [ ] Xác định có "chuyển dữ liệu xuyên biên giới" không. Theo Điều 20 Luật 91/2025, gồm 3 trường hợp:
  - chuyển dữ liệu ra hệ thống lưu trữ đặt ở nước ngoài
  - chuyển cho tổ chức ở nước ngoài
  - dùng nền tảng ở nước ngoài để xử lý dữ liệu

  Ví dụ thường gặp: lưu dữ liệu khách trên Firebase, Mailchimp, CRM, hosting đặt ở nước ngoài.
- [ ] Đã lập và gửi hồ sơ đánh giá tác động chuyển dữ liệu xuyên biên giới trong **60 ngày kể từ lần chuyển đầu tiên** (khoản 2 Điều 20 Luật 91/2025). Khoản 6 Điều 20 có các trường hợp được miễn. Cập nhật hồ sơ theo Điều 22.
- [ ] Hồ sơ theo Mẫu 09, thông báo Bộ Công an, có văn bản ràng buộc với bên nhận ở nước ngoài (Điều 18 NĐ 356/2025). Theo EY, cơ quan chuyên trách (A05) thẩm định hồ sơ trong 15 ngày.

## E. Tổ chức & trách nhiệm nội bộ

Xem phần miễn trừ ở đầu file trước. Mục này là phần được miễn theo khoản 3 Điều 38.

- [ ] Đã lập đánh giá tác động xử lý dữ liệu (DPIA), gửi trong 60 ngày (Điều 21 Luật 91/2025). Cập nhật hồ sơ khi có thay đổi (Điều 22).
- [ ] Có quy trình thông báo vi phạm/rò rỉ dữ liệu cho cơ quan chuyên trách **chậm nhất 72 giờ** (Điều 23 khoản 1 Luật 91/2025). Dùng Mẫu 08 theo NĐ 356/2025.
- [ ] Đã chỉ định bộ phận/nhân sự bảo vệ dữ liệu (Điều 33 Luật 91/2025, toàn văn CHƯA XÁC MINH). Nhân sự cần trình độ cao đẳng trở lên, 2 năm kinh nghiệm và đã qua đào tạo (Điều 13 NĐ 356/2025).

## F. Hành vi bị cấm
- [ ] Không mua bán dữ liệu cá nhân (Điều 7 khoản 6 Luật 91/2025).
- [ ] Không sử dụng dữ liệu cá nhân của người khác trái phép (Điều 7 khoản 5).
- [ ] Không chiếm đoạt, cố ý làm lộ, làm mất dữ liệu cá nhân (Điều 7 khoản 7).
- [ ] Không thu thập vượt quá mục đích đã công bố (căn cứ Điều 9: đồng ý theo từng mục đích).

## Mức phạt
Xem checklist 08. Tóm tắt Điều 8 Luật 91/2025: chuyển dữ liệu xuyên biên giới sai phạm tới 5% doanh thu năm liền trước; mua bán dữ liệu tới 10 lần khoản thu từ vi phạm; hành vi khác tới 3 tỷ đồng (mức của tổ chức).
