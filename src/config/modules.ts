export interface PortalModule {
  id: string
  title: string
  shortTitle: string
  badge: string
  active: boolean
  description: string
  questionCount: number
  criticalCount: number
}

export const PORTAL_MODULES: PortalModule[] = [
  {
    id: 'gplx-a1',
    title: 'Ôn Thi GPLX Xe Máy (Hạng A1)',
    shortTitle: 'GPLX Xe Máy A1',
    badge: '150 câu',
    active: true,
    description: 'Bộ 150 câu hỏi lý thuyết sát hạch lái xe máy hạng A1 chuẩn GTVT',
    questionCount: 150,
    criticalCount: 6,
  },
  {
    id: 'huan-luyen-dieu-lenh',
    title: 'Điều Lệnh Quân Đội (QNCN)',
    shortTitle: 'Điều Lệnh Quân Đội (QNCN)',
    badge: '36 câu',
    active: true,
    description: 'Bộ câu hỏi trắc nghiệm kiểm tra lý thuyết Điều lệnh đội ngũ Quân đội nhân dân Việt Nam (QNCN)',
    questionCount: 36,
    criticalCount: 7,
  },
]
