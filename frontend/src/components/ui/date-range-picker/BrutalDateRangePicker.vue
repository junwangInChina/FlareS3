<script setup>
import { computed, ref, watch } from 'vue'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
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
  placeholder: { type: String, default: '' },
  disabled: Boolean,
  readonly: Boolean,
  size: { type: String, default: 'medium' },
  clearable: { type: Boolean, default: false },
  numberOfMonths: { type: Number, default: 2 },
})

const emit = defineEmits(['update:startValue', 'update:endValue'])
const { t } = useI18n({ useScope: 'global' })

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

const resolvedPlaceholder = computed(() => props.placeholder || t('dateRange.placeholder'))

const displayText = computed(() => {
  if (hasStart.value && hasEnd.value) return `${props.startValue} - ${props.endValue}`
  if (hasStart.value && !hasEnd.value) return `${props.startValue} - ${t('dateRange.endDate')}`
  return resolvedPlaceholder.value
})

const reserveClearSpace = computed(() => props.clearable)
const showClear = computed(
  () => reserveClearSpace.value && hasValue.value && !props.disabled && !props.readonly
)

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
        :aria-label="t('dateRange.clear')"
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
  gap: 10px;
  width: 100%;
  font-family: var(--nb-font-sans);
  font-weight: 300;
  font-size: 14px;
  border: var(--nb-border);
  border-radius: var(--nb-radius);
  background: var(--nb-input-bg);
  color: var(--nb-black);
  cursor: pointer;
  outline: none;
  transition: var(--nb-transition);
}

.date-range-picker.has-clear .date-range-trigger {
  padding-right: 40px;
}

.size-small .date-range-trigger {
  height: 36px;
  padding: 0 12px;
  line-height: 34px;
}

.size-medium .date-range-trigger {
  height: 44px;
  padding: 0 16px;
  line-height: 42px;
}

.size-large .date-range-trigger {
  height: 52px;
  padding: 0 20px;
  line-height: 50px;
}

.date-range-trigger:focus {
  outline: none;
  border-color: var(--nb-deep-blue);
  box-shadow: var(--nb-focus-ring);
}

.date-range-trigger[disabled] {
  background-color: var(--nb-gray-200);
  color: var(--nb-gray-400);
  border-color: var(--nb-gray-400);
  cursor: not-allowed;
}

.date-range-trigger[data-placeholder] .date-range-text {
  color: var(--nb-gray-400);
}

.date-range-icon {
  opacity: 0.8;
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
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: var(--nb-radius);
  color: var(--nb-gray-500);
  cursor: pointer;
}

.date-range-clear:hover {
  background: var(--nb-primary);
  color: var(--nb-ink);
}
</style>

<style>
:root[data-ui-theme='motherduck-neobrutalism'] .date-range-popover {
  width: max-content;
  padding: 12px;
  background: var(--nb-surface);
  color: var(--nb-black);
  border: var(--nb-border);
  border-radius: var(--nb-radius);
  box-shadow: var(--nb-shadow);
  z-index: 1100;
}

:root[data-ui-theme='motherduck-neobrutalism'] .date-range-calendar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

:root[data-ui-theme='motherduck-neobrutalism'] .date-range-calendar-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:root[data-ui-theme='motherduck-neobrutalism'] .date-range-nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: var(--nb-border);
  border-radius: var(--nb-radius);
  background: var(--nb-bg);
  color: var(--nb-black);
  cursor: pointer;
  box-shadow: var(--nb-shadow-sm);
}

:root[data-ui-theme='motherduck-neobrutalism'] .date-range-nav-btn:hover {
  transform: translate(var(--nb-lift-x), var(--nb-lift-y));
}

:root[data-ui-theme='motherduck-neobrutalism'] .date-range-months {
  display: grid;
  gap: 16px;
}

:root[data-ui-theme='motherduck-neobrutalism'] .date-range-months.two-months {
  grid-template-columns: 1fr 1fr;
}

:root[data-ui-theme='motherduck-neobrutalism'] .date-range-month-title {
  text-align: center;
  font-size: 14px;
  font-weight: var(--nb-ui-font-weight, 700);
  margin-bottom: 8px;
  font-variant-numeric: tabular-nums;
}

:root[data-ui-theme='motherduck-neobrutalism'] .date-range-grid {
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
}

:root[data-ui-theme='motherduck-neobrutalism'] .date-range-weekday {
  width: 40px;
  height: 32px;
  font-size: 12px;
  font-weight: var(--nb-ui-font-weight, 700);
  color: var(--nb-gray-500);
  text-align: center;
}

:root[data-ui-theme='motherduck-neobrutalism'] .date-range-cell {
  padding: 0;
}

:root[data-ui-theme='motherduck-neobrutalism'] .date-range-day {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 14px;
  line-height: 1;
  border: var(--nb-border);
  border-radius: var(--nb-radius);
  background: transparent;
  color: var(--nb-black);
  cursor: pointer;
  user-select: none;
}

:root[data-ui-theme='motherduck-neobrutalism'] .date-range-day:hover {
  background: var(--nb-primary);
  color: var(--nb-ink);
}

:root[data-ui-theme='motherduck-neobrutalism'] .date-range-day[data-outside-view],
:root[data-ui-theme='motherduck-neobrutalism'] .date-range-day[data-outside-visible-view] {
  color: var(--nb-gray-400);
  opacity: 0.75;
}

:root[data-ui-theme='motherduck-neobrutalism'] .date-range-day[data-disabled],
:root[data-ui-theme='motherduck-neobrutalism'] .date-range-day[data-unavailable] {
  pointer-events: none;
  opacity: 0.4;
}

:root[data-ui-theme='motherduck-neobrutalism'] .date-range-day[data-today] {
  box-shadow: inset 0 0 0 2px var(--nb-deep-blue);
}

:root[data-ui-theme='motherduck-neobrutalism'] .date-range-day[data-selected] {
  background: var(--nb-gray-200);
}

:root[data-ui-theme='motherduck-neobrutalism'] .date-range-day[data-selection-start],
:root[data-ui-theme='motherduck-neobrutalism'] .date-range-day[data-selection-end] {
  background: var(--nb-primary);
  color: var(--nb-ink);
}
</style>
