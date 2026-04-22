import { getTotalUserUsedSpace } from './uploadReservations'

export async function getUserUsedSpace(db: D1Database, userId: string): Promise<number> {
  return getTotalUserUsedSpace(db, userId)
}
