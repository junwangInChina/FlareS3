<script setup>
import { computed, ref, watch } from 'vue'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-vue-next'
import {
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
  RangeCalendarCell,
  RangeCalendarCellTrigger,
  RangeCalendarGrid,
  RangeCalendarGridBody,
  RangeCalendarGridHead,
  RangeCalendarGridRow,
  RangeCalendarHeadCell,
  RangeCalendarNext,
  RangeCalendarPrev,
  RangeCalendarRoot,
} from 'radix-vue'
import { parseDate } from '@internationalized/date'

const props = defineProps({
  startValue: { type: String, default: '' }, // YYYY-MM-DD
  endValue: { type: String, default: '' }, // YYYY-MM-DD
  placeholder: { type: String, default: '开始日期 - 结束日期' },
  disabled: Boolean,
  readonly: Boolean,
  size: { type: String, default: 'medium' },
  clearable: { type: Boolean, default: false },
  numberOfMonths: { type: Number, default: 2 },
})

const emit = defineEmits(['update:startValue', 'update:endValue'])

const open = ref(false)

const parseDateValue = (value) => {
  if (!value) return undefined
  try {
    return parseDate(value)
  } catch {
    return undefined
  }
}

const calendarValue = computed({
  get() {
    return {
      start: parseDateValue(props.startValue),
      end: parseDateValue(props.endValue),
    }
  },
  set(value) {
    emit('update:startValue', value?.start ? value.start.toString() : '')
    emit('update:endValue', value?.end ? value.end.toString() : '')
  },
})

const hasStart = computed(() => !!props.startValue)
const hasEnd = computed(() => !!props.endValue)
const hasValue = computed(() => hasStart.value || hasEnd.value)

const displayText = computed(() => {
  if (hasStart.value && hasEnd.value) return `${props.startValue} - ${props.endValue}`
  if (hasStart.value && !hasEnd.value) return `${props.startValue} - 结束日期`
  return props.placeholder
})

const reserveClearSpace = computed(() => props.clearable)
const showClear = computed(() => reserveClearSpace.value && hasValue.value && !props.disabled && !props.readonly)

const handleClear = () => {
  emit('update:startValue', '')
  emit('update:endValue', '')
  open.value = false
}

watch(
  () => [props.startValue, props.endValue],
  ([start, end]) => {
    if (!open.value) return
    if (start && end) {
      open.value = false
    }
  }
)

const formatMonthTitle = (monthValue) => {
  const year = monthValue?.year
  const month = monthValue?.month
  if (!year || !month) return ''
  return `${year}-${String(month).padStart(2, '0')}`
}
</script>

<template>
  <PopoverRoot v-model:open="open">
    <div class="date-range-picker" :class="[`size-${size}`, { 'has-clear': reserveClearSpace }]">
      <PopoverTrigger as-child>
        <button
          type="button"
          class="date-range-trigger"
          :disabled="disabled"
          :data-placeholder="hasValue ? null : ''"
        >
          <Calendar class="date-range-icon" :size="16" />
          <span class="date-range-text">{{ displayText }}</span>
        </button>
      </PopoverTrigger>

      <button
        v-if="showClear"
        type="button"
        class="date-range-clear"
        :disabled="disabled"
        aria-label="清除日期范围"
        @click.stop="handleClear"
      >
        <X :size="14" />
      </button>
    </div>

    <PopoverPortal>
      <PopoverContent class="date-range-popover" align="start" :side-offset="6">
        <RangeCalendarRoot
          v-model="calendarValue"
          :disabled="disabled"
          :readonly="readonly"
          :number-of-months="numberOfMonths"
          :fixed-weeks="true"
        >
          <template #default="{ grid, weekDays }">
            <div class="date-range-calendar">
              <div class="date-range-calendar-nav">
                <RangeCalendarPrev class="date-range-nav-btn">
                  <ChevronLeft :size="16" />
                </RangeCalendarPrev>
                <RangeCalendarNext class="date-range-nav-btn">
                  <ChevronRight :size="16" />
                </RangeCalendarNext>
              </div>

              <div class="date-range-months" :class="{ 'two-months': (grid?.length ?? 0) > 1 }">
                <div v-for="month in grid" :key="month.value.toString()" class="date-range-month">
                  <div class="date-range-month-title">
                    {{ formatMonthTitle(month.value) }}
                  </div>

                  <RangeCalendarGrid class="date-range-grid">
                    <RangeCalendarGridHead>
                      <RangeCalendarGridRow>
                        <RangeCalendarHeadCell
                          v-for="day in weekDays"
                          :key="day"
                          class="date-range-weekday"
                        >
                          {{ day }}
                        </RangeCalendarHeadCell>
                      </RangeCalendarGridRow>
                    </RangeCalendarGridHead>

                    <RangeCalendarGridBody>
                      <RangeCalendarGridRow
                        v-for="(week, weekIndex) in month.rows"
                        :key="`${month.value.toString()}-${weekIndex}`"
                        class="date-range-row"
                      >
                        <RangeCalendarCell
                          v-for="day in week"
                          :key="day.toString()"
                          :date="day"
                          class="date-range-cell"
                        >
                          <RangeCalendarCellTrigger
                            :day="day"
                            :month="month.value"
                            class="date-range-day"
                          >
                            <template #default="{ dayValue }">
                              {{ dayValue }}
                            </template>
                          </RangeCalendarCellTrigger>
                        </RangeCalendarCell>
                      </RangeCalendarGridRow>
                    </RangeCalendarGridBody>
                  </RangeCalendarGrid>
                </div>
              </div>
            </div>
          </template>
        </RangeCalendarRoot>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style scoped>
.date-range-picker {
  position: relative;
  width: 100%;
}

.date-range-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  font-family: var(--nb-font-sans);
  font-weight: var(--nb-font-weight-regular);
  font-size: 0.875rem;
  border: 1px solid var(--input);
  border-radius: var(--nb-radius-md);
  background: var(--background);
  color: var(--foreground);
  cursor: pointer;
  outline: none;
  transition: box-shadow 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
}

.date-range-picker.has-clear .date-range-trigger {
  padding-right: 40px;
}

.size-small .date-range-trigger {
  height: 36px;
  padding: 0 12px;
}

.size-medium .date-range-trigger {
  height: 40px;
  padding: 0 12px;
}

.size-large .date-range-trigger {
  height: 44px;
  padding: 0 16px;
}

.date-range-trigger:focus-visible {
  box-shadow: var(--nb-focus-ring);
}

.date-range-trigger[disabled] {
  cursor: not-allowed;
  opacity: 0.5;
}

.date-range-trigger[data-placeholder] .date-range-text {
  color: var(--muted-foreground);
}

.date-range-icon {
  opacity: 0.6;
  flex-shrink: 0;
}

.date-range-text {
  flex: 1;
  min-width: 0;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
}

.date-range-clear {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: var(--nb-radius-sm);
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  padding: 0;
}

.date-range-clear:hover {
  background: var(--accent);
  color: var(--accent-foreground);
}

.date-range-clear:focus-visible {
  box-shadow: var(--nb-focus-ring);
}
</style>

<style>
:root[data-ui-theme="shadcn"] .date-range-popover {
  width: max-content;
  padding: 12px;
  background: var(--popover);
  color: var(--popover-foreground);
  border: 1px solid var(--border);
  border-radius: var(--nb-radius-md);
  box-shadow: var(--nb-shadow-md);
  z-index: 1100;
}

:root[data-ui-theme="shadcn"] .date-range-calendar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

:root[data-ui-theme="shadcn"] .date-range-calendar-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:root[data-ui-theme="shadcn"] .date-range-nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--nb-radius-sm);
  border: 1px solid transparent;
  background: transparent;
  color: var(--foreground);
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

:root[data-ui-theme="shadcn"] .date-range-nav-btn:hover {
  background: var(--accent);
  color: var(--accent-foreground);
}

:root[data-ui-theme="shadcn"] .date-range-nav-btn:focus-visible {
  box-shadow: var(--nb-focus-ring);
}

:root[data-ui-theme="shadcn"] .date-range-months {
  display: grid;
  gap: 16px;
}

:root[data-ui-theme="shadcn"] .date-range-months.two-months {
  grid-template-columns: 1fr 1fr;
}

:root[data-ui-theme="shadcn"] .date-range-month-title {
  text-align: center;
  font-size: 0.875rem;
  font-weight: var(--nb-font-weight-medium);
  margin-bottom: 8px;
  font-variant-numeric: tabular-nums;
}

:root[data-ui-theme="shadcn"] .date-range-grid {
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
}

:root[data-ui-theme="shadcn"] .date-range-weekday {
  width: 36px;
  height: 32px;
  font-size: 0.75rem;
  font-weight: var(--nb-font-weight-medium);
  color: var(--muted-foreground);
  text-align: center;
}

:root[data-ui-theme="shadcn"] .date-range-cell {
  padding: 0;
}

:root[data-ui-theme="shadcn"] .date-range-day {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 0.875rem;
  line-height: 1;
  border-radius: var(--nb-radius-sm);
  cursor: pointer;
  outline: none;
  user-select: none;
  transition: background-color 0.15s ease, color 0.15s ease;
}

:root[data-ui-theme="shadcn"] .date-range-day:hover {
  background: var(--accent);
  color: var(--accent-foreground);
}

:root[data-ui-theme="shadcn"] .date-range-day[data-outside-view],
:root[data-ui-theme="shadcn"] .date-range-day[data-outside-visible-view] {
  color: var(--muted-foreground);
  opacity: 0.5;
}

:root[data-ui-theme="shadcn"] .date-range-day[data-disabled],
:root[data-ui-theme="shadcn"] .date-range-day[data-unavailable] {
  pointer-events: none;
  opacity: 0.4;
}

:root[data-ui-theme="shadcn"] .date-range-day[data-today] {
  box-shadow: inset 0 0 0 1px var(--border);
}

:root[data-ui-theme="shadcn"] .date-range-day:focus-visible {
  box-shadow: var(--nb-focus-ring);
}

/* Selected range */
:root[data-ui-theme="shadcn"] .date-range-day[data-selected] {
  background: var(--accent);
  color: var(--accent-foreground);
}

:root[data-ui-theme="shadcn"] .date-range-day[data-selected]:not([data-selection-start]):not([data-selection-end]) {
  border-radius: 0;
}

:root[data-ui-theme="shadcn"] .date-range-day[data-selection-start],
:root[data-ui-theme="shadcn"] .date-range-day[data-selection-end] {
  background: var(--primary);
  color: var(--primary-foreground);
}

:root[data-ui-theme="shadcn"] .date-range-day[data-selection-start] {
  border-top-left-radius: var(--nb-radius-sm);
  border-bottom-left-radius: var(--nb-radius-sm);
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

:root[data-ui-theme="shadcn"] .date-range-day[data-selection-end] {
  border-top-right-radius: var(--nb-radius-sm);
  border-bottom-right-radius: var(--nb-radius-sm);
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

:root[data-ui-theme="shadcn"] .date-range-day[data-selection-start][data-selection-end] {
  border-radius: var(--nb-radius-sm);
}

/* Hover-highlighted range (during selection) */
:root[data-ui-theme="shadcn"] .date-range-day[data-highlighted] {
  background: var(--muted);
  color: var(--muted-foreground);
}

:root[data-ui-theme="shadcn"] .date-range-day[data-highlighted-start],
:root[data-ui-theme="shadcn"] .date-range-day[data-highlighted-end] {
  background: var(--accent);
  color: var(--accent-foreground);
}
</style>
