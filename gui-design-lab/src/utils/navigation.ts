import { pageMap, pages, type LabPage } from '../data/pages'

export function getPageBySlug(pageSlug: string) {
  return pageMap.get(pageSlug)
}

export function getPageIndex(pageSlug: string) {
  return pages.findIndex((page) => page.slug === pageSlug)
}

export function getAdjacentPages(pageSlug: string) {
  const index = getPageIndex(pageSlug)
  return {
    previous: index > 0 ? pages[index - 1] : null,
    next: index >= 0 && index < pages.length - 1 ? pages[index + 1] : null,
  }
}

export function formatPageNumber(page: LabPage) {
  return page.id.toString().padStart(2, '0')
}
