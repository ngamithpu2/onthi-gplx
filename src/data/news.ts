export interface NewsArticle {
  id: string
  title: string
  date: string
  month: string
  unit: string
  author: string
  views: number
  tag: 'thongbao' | 'huanluyen' | 'hoatdong'
  tagLabel: string
  summary: string
  heroImage: string
  heroImageCaption?: string
  content: Array<{
    type: 'paragraph' | 'heading' | 'image'
    text?: string
    imageUrl?: string
    caption?: string
  }>
}

export const K602_FEATURED_ARTICLE: NewsArticle = {
  id: 'k602-60-nam-truyen-thong',
  title: 'Kho K602 kỷ niệm 60 năm Ngày truyền thống và đón nhận Huân chương Bảo vệ Tổ quốc Hạng Nhì',
  date: '26/03/2025',
  month: '2025-03',
  unit: 'Ban Chính trị',
  author: 'Thu Trang',
  views: 837,
  tag: 'hoatdong',
  tagLabel: 'Sự kiện nổi bật',
  summary:
    'Ngày 26/3, Kho K602 thuộc Tổng cục Công nghiệp Quốc phòng tổ chức Lễ kỷ niệm 60 năm ngày truyền thống đơn vị (26/3/1965-26/3/2025) và đón nhận Huân chương Bảo vệ Tổ quốc Hạng Nhì. Về dự buổi lễ có Thiếu tướng Lê Quang Tuyến, Ủy viên Đảng ủy, Phó Chủ nhiệm Tổng cục Công nghiệp Quốc phòng; Đồng chí Nguyễn Huy Dũng, Phó Bí thư Tỉnh ủy, Chủ tịch UBND tỉnh Thái Nguyên; các đồng chí lãnh đạo Thành phố Phổ Yên và đại diện các cơ quan, ban ngành.',
  heroImage: '/news-images/image1.jpeg',
  heroImageCaption: 'Quang cảnh buổi Lễ',
  content: [
    {
      type: 'paragraph',
      text: 'Ngày 26/3, Kho K602 thuộc Tổng cục Công nghiệp Quốc phòng tổ chức Lễ kỷ niệm 60 năm ngày truyền thống đơn vị (26/3/1965-26/3/2025) và đón nhận Huân chương Bảo vệ Tổ quốc Hạng Nhì. Về dự buổi lễ có Thiếu tướng Lê Quang Tuyến, Ủy viên Đảng ủy, Phó Chủ nhiệm Tổng cục Công nghiệp Quốc phòng; Đồng chí Nguyễn Huy Dũng, Phó Bí thư Tỉnh ủy, Chủ tịch UBND tỉnh Thái Nguyên. Thành phố Phổ Yên có các đồng chí: Nguyễn Xuân Trường, Phó Bí thư Thường trực Thành ủy; Vũ Thị Thơm, Ủy viên Ban thường vụ, Trưởng Ban Tuyên giáo và Dân vận Thành ủy; Lãnh đạo một số cơ quan, đơn vị, xã, phường trên địa bàn thành phố.',
    },
    {
      type: 'image',
      imageUrl: '/news-images/image1.jpeg',
      caption: 'Quang cảnh buổi Lễ',
    },
    {
      type: 'image',
      imageUrl: '/news-images/image2.jpeg',
      caption: 'Các đại biểu về dự buổi Lễ',
    },
    {
      type: 'paragraph',
      text: 'Kho K602 thuộc Tổng cục Công nghiệp Quốc phòng, thành lập ngày 26-3-1965, trên cơ sở sáp nhập Kho T826 và Kho T804; có nhiệm vụ quản lý vật tư dự trữ quốc gia cho quốc phòng và vật tư cho sản xuất quốc phòng. Trong kháng chiến chống Mỹ, cứu nước, cán bộ, chiến sĩ của Kho đã ngày đêm bám ga, bám cảng, sơ tán vật tư, không để máy bay Mỹ đánh phá, bảo đảm an toàn cho hàng trăm ngàn tấn vật tư quốc phòng. Trong thời bình, cán bộ, công nhân viên, chiến sĩ của Kho luôn đề cao cảnh giác trước âm mưu phá hoại của các thế lực thù địch, nêu cao tinh thần trách nhiệm trong quản lý, bảo vệ, bảo quản, cấp phát vật tư kỹ thuật, cung ứng kịp thời cho nghiên cứu, chế thử và sản xuất của ngành Công nghiệp Quốc phòng, xứng đáng với vị trí của đơn vị "Giữ lửa cho công nghiệp quốc phòng".',
    },
    {
      type: 'image',
      imageUrl: '/news-images/image3.jpeg',
      caption: 'Đại tá Lê Việt Dũng, Chủ nhiệm Kho K602 đọc Diễn văn Kỷ niệm',
    },
    {
      type: 'image',
      imageUrl: '/news-images/image4.jpeg',
      caption: 'Các đại biểu về dự buổi lễ Kỷ niệm',
    },
    {
      type: 'paragraph',
      text: 'Được sự quan tâm của Bộ Quốc phòng và Tổng cục Công nghiệp Quốc phòng, những năm qua, Kho đã được trang bị nhiều phương tiện hiện đại phục vụ công tác quản lý, bảo vệ, phòng chống cháy, nổ, đảm bảo an toàn vật tư, trang bị. Đơn vị đã phát huy truyền thống tự lực, tự cường, chủ động triển khai nhiều biện pháp đảm bảo an toàn kho vật liệu nổ, góp phần nâng cao hiệu quả bảo đảm an toàn vật tư, hàng hoá.',
    },
    {
      type: 'image',
      imageUrl: '/news-images/image5.jpeg',
      caption: 'Thiếu tướng Lê Quang Tuyến, Phó chủ nhiệm Tổng cục Công nghiệp Quốc phòng phát biểu chúc mừng tại buổi Lễ',
    },
    {
      type: 'paragraph',
      text: 'Bên cạnh đó, Kho còn áp dụng nhiều phương pháp bảo quản khác nhau cho từng loại vật tư, từ phương pháp thủ công đến các phương pháp tiên tiến, ứng dụng tiến bộ khoa học kỹ thuật; đồng thời, triển khai thực hiện có hiệu quả các yêu cầu của Cuộc vận động 5 không, nhất là đối với các phương tiện vận tải và trang bị kỹ thuật phục vụ công việc tiếp nhận, cấp phát, dồn chuyển, sắp xếp, bảo quản, bảo vệ, bảo đảm an toàn... Đơn vị luôn quan tâm xây dựng đơn vị VMTD, sẵn sàng chiến đấu cao.',
    },
    {
      type: 'image',
      imageUrl: '/news-images/image6.jpeg',
      caption: 'Kho K602 vinh dự được đón nhận Huân chương Bảo vệ Tổ Quốc Hạng Nhì',
    },
    {
      type: 'image',
      imageUrl: '/news-images/image7.jpeg',
      caption: 'Kho K602 vinh dự được đón nhận Huân chương Bảo vệ Tổ Quốc Hạng Nhì',
    },
    {
      type: 'paragraph',
      text: 'Nhiều năm được Tổng cục chọn xây dựng điểm về xây dựng chính quy, chấp hành kỷ luật. Tổ chức biên chế luôn được kiện toàn, đặc biệt năm 2024 sau 10 năm sáp nhập Kho K612 vào Kho K602 đơn vị đã được Bộ quốc phòng, Bộ tổng tham mưu phê duyệt tổ chức biên chế mới. Đơn vị hiện có 04 ban, cơ quan, 03 phân kho, 03 đội trực thuộc với quân số gần 200 đồng chí. Đảng bộ cơ sở 02 cấp với 10 chi bộ và gần 150 đảng viên; các tổ chức quần chúng phát huy tốt vai trò, năng động, sáng tạo, xung kích trong thực hiện nhiệm vụ; mối quan hệ đoàn kết nội bộ, đoàn kết quân dân luôn gắn kết, bền vững; thực hiện tốt công tác chính sách quân đội và hậu phương quân đội; xây dựng được môi trường văn hóa lành mạnh, văn minh; cảnh quan đơn vị sáng, xanh, sạch, đẹp. Đời sống vật chất, điều kiện làm việc, sinh hoạt của bộ đội ngày càng được nâng cao.',
    },
    {
      type: 'image',
      imageUrl: '/news-images/image8.jpeg',
      caption: 'Các đại biểu về dự chúc mừng buổi lễ',
    },
    {
      type: 'paragraph',
      text: 'Trải qua 6 thập kỷ xây dựng và phát triển, dưới sự lãnh đạo, chỉ đạo trực tiếp của Đảng ủy, Thủ trưởng Tổng cục CNQP, cùng sự nỗ lực phấn đấu và thành tích đã đạt được của các thế hệ, Kho K602 đã vinh dự được Đảng, Nhà nước, Quân đội tặng nhiều phần thưởng cao quí như: Danh hiệu Anh hùng LLVT nhân dân; 06 Huân chương Chiến công hạng Nhất, Nhì, Ba; 01 Huân chương Quân công hạng Ba; 02 Huân chương BVTQ; 02 Bằng khen của Thủ tướng Chính phủ; nhiều Cờ thi đua của Tổng cục CNQP và phần thưởng cao quý khác; hàng ngàn lượt cán bộ, chiến sĩ, công nhân viên được Thủ trưởng các cấp khen thưởng.',
    },
    {
      type: 'image',
      imageUrl: '/news-images/image9.jpeg',
      caption: 'Tiết mục văn nghệ chào mừng buổi Lễ',
    },
    {
      type: 'image',
      imageUrl: '/news-images/image10.jpeg',
      caption: 'Đoàn đại biểu Thành phố Phổ Yên tặng hoa chúc mừng Kho K602 nhân dịp Kỷ niệm',
    },
    {
      type: 'paragraph',
      text: 'Đặc biệt, nhân dịp kỷ niệm 60 năm Ngày truyền thống, Kho K602 vinh dự được Chủ tịch nước Cộng hòa XHCN Việt Nam tặng thưởng Huân chương Bảo vệ Tổ quốc hạng Nhì vì có "Thành tích xuất sắc, đột xuất trong nghiên cứu, quản lý, giữ gìn, bảo đảm các loại vật tư, thiết bị đặc chủng đáp ứng yêu cầu dự trữ quốc gia và chiến lược xây dựng, phát triển công nghiệp quốc phòng lưỡng dụng, hiện đại, góp phần vào sự nghiệp xây dựng Chủ nghĩa xã hội và bảo vệ Tổ quốc". Đây là niềm vinh dự, tự hào đối với đơn vị, đồng thời cũng là động lực để đội ngũ cán bộ, chiến sĩ Kho K602 tiếp tục phát huy truyền thống và thành tích vẻ vang đó, tiếp tục củng cố cơ sở hạ tầng, nâng cao năng lực quản lý, nhập, xuất, dồn chuyển, bảo quản vật tư nhằm đáp ứng kịp thời trong tình hình, nhiệm vụ mới, xây dựng đơn vị vững mạnh toàn diện./.',
    },
  ],
}
