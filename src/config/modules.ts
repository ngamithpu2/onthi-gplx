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
]
