export interface CourseCategory {
  id: string
  name: string
  shortName: string
  badge: string
  questionCountText: string
  active: boolean
  description: string
}

export const COURSE_CATEGORIES: CourseCategory[] = [
  {
    id: 'gplx-a1',
    name: 'Thi GPLX Xe máy (Hạng A1)',
    shortName: 'Xe máy A1',
    badge: '150 câu',
    questionCountText: 'Bộ đề 150 câu chuẩn GTVT',
    active: true,
    description: 'Chương trình luyện thi sát hạch lý thuyết xe máy A1',
  },
  {
    id: 'gplx-a2',
    name: 'Thi GPLX Xe máy PKL (Hạng A2)',
    shortName: 'Xe máy A2',
    badge: '450 câu',
    questionCountText: 'Sắp ra mắt',
    active: false,
    description: 'Chương trình luyện thi xe máy phân khối lớn A2',
  },
  {
    id: 'gplx-b2',
    name: 'Thi GPLX Ô tô (Hạng B2)',
    shortName: 'Ô tô B2',
    badge: '600 câu',
    questionCountText: 'Sắp mở',
    active: false,
    description: 'Bộ 600 câu hỏi lý thuyết sát hạch ô tô B2',
  },
  {
    id: 'gplx-b1',
    name: 'Thi GPLX Ô tô (Hạng B1)',
    shortName: 'Ô tô B1',
    badge: '600 câu',
    questionCountText: 'Sắp mở',
    active: false,
    description: 'Bộ đề ôn thi lái xe ô tô số tự động B1',
  },
  {
    id: 'bien-bao',
    name: 'Tra cứu Biển báo Giao thông',
    shortName: 'Biển báo',
    badge: 'Hệ thống',
    questionCountText: 'Sắp mở',
    active: false,
    description: 'Tra cứu nhanh các nhóm biển báo đường bộ Việt Nam',
  },
  {
    id: 'meo-thi',
    name: 'Mẹo thi lý thuyết & Sa hình',
    shortName: 'Mẹo thi',
    badge: 'Kinh nghiệm',
    questionCountText: 'Sắp mở',
    active: false,
    description: 'Mẹo ghi nhớ nhanh đáp án và kinh nghiệm thi sa hình',
  },
]
