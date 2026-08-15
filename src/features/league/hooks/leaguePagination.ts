export const HOME_LEAGUE_PAGE_SIZE = 20

export function getNextLeaguePage(lastPage: { rows: unknown[]; total: number; page: number; limit: number }): number | undefined {
  return lastPage.rows.length > 0 && lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined
}
