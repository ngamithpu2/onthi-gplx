import questionsJson from './questions.json'
import { GPLX_A1_MODULE } from './config'
import type { Question } from '../../types'

export const gplxA1Questions = questionsJson as Question[]
export { GPLX_A1_MODULE }
