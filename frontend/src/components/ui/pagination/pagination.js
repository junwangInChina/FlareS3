const toNumber = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export const clampPage = (value, min, max) => {
  const numeric = toNumber(value)
  const minValue = toNumber(min)
  const maxValue = toNumber(max)
  if (maxValue < minValue) return minValue
  return Math.min(Math.max(numeric, minValue), maxValue)
}

export const getTotalPages = (total, pageSize) => {
  const totalValue = toNumber(total)
  const pageSizeValue = toNumber(pageSize)
  if (totalValue <= 0 || pageSizeValue <= 0) return 0
  return Math.ceil(totalValue / pageSizeValue)
}

export const getPaginationItems = ({ page, totalPages, siblingCount = 1 }) => {
  const total = toNumber(totalPages)
  if (total <= 0) return []

  const siblingValue = Math.max(0, Math.floor(toNumber(siblingCount)))
  const currentPage = clampPage(page, 1, total)

  const firstPage = 1
  const lastPage = total

  const leftSiblingIndex = Math.max(currentPage - siblingValue, firstPage)
  const rightSiblingIndex = Math.min(currentPage + siblingValue, lastPage)

  const showLeftEllipsis = leftSiblingIndex > firstPage + 2
  const showRightEllipsis = rightSiblingIndex < lastPage - 2

  const items = [firstPage]

  if (showLeftEllipsis) {
    items.push('ellipsis')
  } else {
    for (let p = firstPage + 1; p < leftSiblingIndex; p += 1) {
      items.push(p)
    }
  }

  for (let p = leftSiblingIndex; p <= rightSiblingIndex; p += 1) {
    if (p !== firstPage && p !== lastPage) {
      items.push(p)
    }
  }

  if (showRightEllipsis) {
    items.push('ellipsis')
  } else {
    for (let p = rightSiblingIndex + 1; p < lastPage; p += 1) {
      items.push(p)
    }
  }

  if (lastPage !== firstPage) {
    items.push(lastPage)
  }

  return items
}
