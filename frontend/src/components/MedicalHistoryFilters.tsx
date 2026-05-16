import { useState } from 'react';
import { Filter, Calendar, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { RecordType, Severity, ConditionTag } from '@/types/patient';

export interface FilterState {
  timeRange: string | null;
  customDateRange: { from: Date | undefined; to: Date | undefined };
  recordTypes: RecordType[];
  doctors: string[];
  departments: string[];
  hospitals: string[];
  severities: Severity[];
  tags: ConditionTag[];
}

interface MedicalHistoryFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableDoctors: string[];
  availableHospitals: string[];
  availableDepartments: string[];
}

const timeRanges = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 days' },
  { value: '30days', label: 'Last 30 days' },
  { value: '6months', label: 'Last 6 months' },
  { value: '1year', label: 'Last 1 year' },
  { value: 'custom', label: 'Custom range' },
];

const recordTypes: { value: RecordType; label: string }[] = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'diagnosis', label: 'Diagnosis' },
  { value: 'lab-test', label: 'Lab Test' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'admission', label: 'Hospital Admission' },
  { value: 'discharge', label: 'Discharge Summary' },
  { value: 'emergency', label: 'Emergency Visit' },
];

const severities: { value: Severity; label: string; color: string }[] = [
  { value: 'normal', label: 'Normal', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
  { value: 'emergency', label: 'Emergency', color: 'bg-orange-100 text-orange-700' },
  { value: 'follow-up', label: 'Follow-up Required', color: 'bg-blue-100 text-blue-700' },
];

const conditionTags: { value: ConditionTag; label: string }[] = [
  { value: 'chronic', label: 'Chronic' },
  { value: 'acute', label: 'Acute' },
  { value: 'allergy-related', label: 'Allergy-related' },
  { value: 'injury', label: 'Injury' },
  { value: 'infection', label: 'Infection' },
  { value: 'lifestyle', label: 'Lifestyle-related' },
];

interface FilterDropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function FilterDropdown({ trigger, children, className }: FilterDropdownProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent 
        className={cn("w-48 p-2 bg-popover border border-border shadow-lg z-50", className)} 
        align="start"
        sideOffset={4}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

interface CheckboxItemProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  className?: string;
}

function CheckboxItem({ checked, onChange, label, className }: CheckboxItemProps) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent text-left transition-colors",
        checked && "bg-accent",
        className
      )}
    >
      <div className={cn(
        "w-4 h-4 rounded border flex items-center justify-center transition-colors",
        checked ? "bg-primary border-primary" : "border-muted-foreground"
      )}>
        {checked && <span className="text-primary-foreground text-xs">✓</span>}
      </div>
      <span className="text-foreground truncate">{label}</span>
    </button>
  );
}

export function MedicalHistoryFilters({
  filters,
  onFiltersChange,
  availableDoctors,
  availableHospitals,
  availableDepartments,
}: MedicalHistoryFiltersProps) {
  const [showCustomDate, setShowCustomDate] = useState(false);

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = <T,>(array: T[], value: T): T[] => {
    return array.includes(value) 
      ? array.filter(v => v !== value)
      : [...array, value];
  };

  const activeFilterCount = [
    filters.timeRange ? 1 : 0,
    filters.recordTypes.length,
    filters.doctors.length,
    filters.departments.length,
    filters.hospitals.length,
    filters.severities.length,
    filters.tags.length,
  ].reduce((a, b) => a + b, 0);

  const clearAllFilters = () => {
    onFiltersChange({
      timeRange: null,
      customDateRange: { from: undefined, to: undefined },
      recordTypes: [],
      doctors: [],
      departments: [],
      hospitals: [],
      severities: [],
      tags: [],
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Time Range Filter */}
      <FilterDropdown
        trigger={
          <Button variant="secondary" size="sm" className="h-8 text-xs">
            <Calendar size={14} />
            {filters.timeRange 
              ? timeRanges.find(t => t.value === filters.timeRange)?.label 
              : 'Time'}
            <ChevronDown size={12} />
          </Button>
        }
      >
        <div className="space-y-1">
          {timeRanges.map(range => (
            <button
              key={range.value}
              onClick={() => {
                if (range.value === 'custom') {
                  setShowCustomDate(true);
                  updateFilter('timeRange', 'custom');
                } else {
                  setShowCustomDate(false);
                  updateFilter('timeRange', filters.timeRange === range.value ? null : range.value);
                }
              }}
              className={cn(
                "w-full px-2 py-1.5 text-sm rounded-md text-left hover:bg-accent transition-colors",
                filters.timeRange === range.value && "bg-accent font-medium"
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </FilterDropdown>

      {/* Custom Date Range Popover */}
      {showCustomDate && (
        <Popover open={showCustomDate} onOpenChange={setShowCustomDate}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              {filters.customDateRange.from 
                ? `${format(filters.customDateRange.from, 'MMM d')}${filters.customDateRange.to ? ` - ${format(filters.customDateRange.to, 'MMM d')}` : ''}`
                : 'Select dates'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
            <CalendarComponent
              mode="range"
              selected={{ from: filters.customDateRange.from, to: filters.customDateRange.to }}
              onSelect={(range) => updateFilter('customDateRange', { from: range?.from, to: range?.to })}
              numberOfMonths={1}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Record Type Filter */}
      <FilterDropdown
        trigger={
          <Button variant="secondary" size="sm" className="h-8 text-xs">
            Type
            {filters.recordTypes.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {filters.recordTypes.length}
              </Badge>
            )}
            <ChevronDown size={12} />
          </Button>
        }
        className="w-52"
      >
        <div className="space-y-0.5 max-h-60 overflow-y-auto">
          {recordTypes.map(type => (
            <CheckboxItem
              key={type.value}
              checked={filters.recordTypes.includes(type.value)}
              onChange={() => updateFilter('recordTypes', toggleArrayFilter(filters.recordTypes, type.value))}
              label={type.label}
            />
          ))}
        </div>
      </FilterDropdown>

      {/* Doctor Filter */}
      {availableDoctors.length > 0 && (
        <FilterDropdown
          trigger={
            <Button variant="secondary" size="sm" className="h-8 text-xs">
              Doctor
              {filters.doctors.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {filters.doctors.length}
                </Badge>
              )}
              <ChevronDown size={12} />
            </Button>
          }
        >
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {availableDoctors.map(doctor => (
              <CheckboxItem
                key={doctor}
                checked={filters.doctors.includes(doctor)}
                onChange={() => updateFilter('doctors', toggleArrayFilter(filters.doctors, doctor))}
                label={doctor}
              />
            ))}
          </div>
        </FilterDropdown>
      )}

      {/* Department Filter */}
      {availableDepartments.length > 0 && (
        <FilterDropdown
          trigger={
            <Button variant="secondary" size="sm" className="h-8 text-xs">
              Dept
              {filters.departments.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {filters.departments.length}
                </Badge>
              )}
              <ChevronDown size={12} />
            </Button>
          }
        >
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {availableDepartments.map(dept => (
              <CheckboxItem
                key={dept}
                checked={filters.departments.includes(dept)}
                onChange={() => updateFilter('departments', toggleArrayFilter(filters.departments, dept))}
                label={dept}
              />
            ))}
          </div>
        </FilterDropdown>
      )}

      {/* Severity Filter */}
      <FilterDropdown
        trigger={
          <Button variant="secondary" size="sm" className="h-8 text-xs">
            Severity
            {filters.severities.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {filters.severities.length}
              </Badge>
            )}
            <ChevronDown size={12} />
          </Button>
        }
      >
        <div className="space-y-0.5">
          {severities.map(sev => (
            <CheckboxItem
              key={sev.value}
              checked={filters.severities.includes(sev.value)}
              onChange={() => updateFilter('severities', toggleArrayFilter(filters.severities, sev.value))}
              label={sev.label}
              className={filters.severities.includes(sev.value) ? sev.color : ''}
            />
          ))}
        </div>
      </FilterDropdown>

      {/* Tags Filter */}
      <FilterDropdown
        trigger={
          <Button variant="secondary" size="sm" className="h-8 text-xs">
            Tags
            {filters.tags.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {filters.tags.length}
              </Badge>
            )}
            <ChevronDown size={12} />
          </Button>
        }
      >
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {conditionTags.map(tag => (
            <CheckboxItem
              key={tag.value}
              checked={filters.tags.includes(tag.value)}
              onChange={() => updateFilter('tags', toggleArrayFilter(filters.tags, tag.value))}
              label={tag.label}
            />
          ))}
        </div>
      </FilterDropdown>

      {/* Clear All */}
      {activeFilterCount > 0 && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 text-xs text-muted-foreground hover:text-foreground"
          onClick={clearAllFilters}
        >
          <X size={14} />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}

export const initialFilterState: FilterState = {
  timeRange: null,
  customDateRange: { from: undefined, to: undefined },
  recordTypes: [],
  doctors: [],
  departments: [],
  hospitals: [],
  severities: [],
  tags: [],
};
