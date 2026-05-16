import { useState, useMemo } from 'react';
import { Plus, Calendar, MapPin, Stethoscope, Activity, Pill, Heart, FileText, Syringe, AlertCircle, Paperclip, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import { MedicalHistoryFilters, FilterState, initialFilterState } from '@/components/MedicalHistoryFilters';
import { subDays, subMonths, subYears, isAfter, isBefore, startOfDay, endOfDay, isToday } from 'date-fns';
import { MedicalRecord } from '@/types/patient';
import { useSearchHighlight } from '@/hooks/useSearchHighlight';

const iconMap = [Activity, Heart, Pill, FileText, Syringe];
const colorMap = [
  'bg-primary/10 text-primary border-primary',
  'bg-pink-100 text-pink-600 border-pink-400',
  'bg-amber-100 text-amber-600 border-amber-400',
  'bg-emerald-100 text-emerald-600 border-emerald-400',
  'bg-violet-100 text-violet-600 border-violet-400',
];

const severityColors: Record<string, string> = {
  normal: 'bg-emerald-100 text-emerald-700',
  critical: 'bg-red-100 text-red-700',
  emergency: 'bg-orange-100 text-orange-700',
  'follow-up': 'bg-blue-100 text-blue-700',
};

export default function MedicalHistoryPage() {
  const { medicalRecords, role } = useApp();
  const navigate = useNavigate();
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  const { isHighlighting } = useSearchHighlight();

  const canAddRecords = role === 'doctor';

  // Extract unique values for filters
  const availableDoctors = useMemo(() => 
    [...new Set(medicalRecords.map(r => r.doctor))], [medicalRecords]
  );
  const availableHospitals = useMemo(() => 
    [...new Set(medicalRecords.map(r => r.hospital))], [medicalRecords]
  );
  const availableDepartments = useMemo(() => 
    [...new Set(medicalRecords.map(r => r.department).filter(Boolean) as string[])], [medicalRecords]
  );
  const selectedRecordData = useMemo(
    () => medicalRecords.find((record) => record.id === selectedRecord) ?? null,
    [medicalRecords, selectedRecord]
  );

  // Apply filters
  const filteredRecords = useMemo(() => {
    return medicalRecords.filter(record => {
      const recordDate = new Date(record.date);
      const today = new Date();

      // Time range filter
      if (filters.timeRange) {
        if (filters.timeRange === 'custom') {
          if (filters.customDateRange.from && isBefore(recordDate, startOfDay(filters.customDateRange.from))) {
            return false;
          }
          if (filters.customDateRange.to && isAfter(recordDate, endOfDay(filters.customDateRange.to))) {
            return false;
          }
        } else {
          let cutoffDate: Date;
          switch (filters.timeRange) {
            case 'today':
              if (!isToday(recordDate)) return false;
              break;
            case '7days':
              cutoffDate = subDays(today, 7);
              if (isBefore(recordDate, cutoffDate)) return false;
              break;
            case '30days':
              cutoffDate = subDays(today, 30);
              if (isBefore(recordDate, cutoffDate)) return false;
              break;
            case '6months':
              cutoffDate = subMonths(today, 6);
              if (isBefore(recordDate, cutoffDate)) return false;
              break;
            case '1year':
              cutoffDate = subYears(today, 1);
              if (isBefore(recordDate, cutoffDate)) return false;
              break;
          }
        }
      }

      // Record type filter
      if (filters.recordTypes.length > 0 && !filters.recordTypes.includes(record.recordType)) {
        return false;
      }

      // Doctor filter
      if (filters.doctors.length > 0 && !filters.doctors.includes(record.doctor)) {
        return false;
      }

      // Department filter
      if (filters.departments.length > 0 && record.department && !filters.departments.includes(record.department)) {
        return false;
      }

      // Hospital filter
      if (filters.hospitals.length > 0 && !filters.hospitals.includes(record.hospital)) {
        return false;
      }

      // Severity filter
      if (filters.severities.length > 0 && !filters.severities.includes(record.severity)) {
        return false;
      }

      // Tags filter
      if (filters.tags.length > 0 && !filters.tags.some(tag => record.tags.includes(tag))) {
        return false;
      }

      return true;
    });
  }, [medicalRecords, filters]);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl lg:text-4xl text-foreground">Medical History</h1>
            <p className="text-muted-foreground mt-1">Timeline of medical events</p>
          </div>
          {canAddRecords && (
            <Button variant="medical" size="sm" onClick={() => navigate('/add-medical-record')}>
              <Plus size={16} />
              Add Record
            </Button>
          )}
        </div>

        {/* Filters Row */}
        <MedicalHistoryFilters
          filters={filters}
          onFiltersChange={setFilters}
          availableDoctors={availableDoctors}
          availableHospitals={availableHospitals}
          availableDepartments={availableDepartments}
        />

        {/* Results count */}
        {(filters.timeRange || filters.recordTypes.length > 0 || filters.doctors.length > 0 || 
          filters.departments.length > 0 || filters.severities.length > 0 || filters.tags.length > 0) && (
          <p className="text-sm text-muted-foreground">
            Showing {filteredRecords.length} of {medicalRecords.length} records
          </p>
        )}
      </div>

      {/* No Results */}
      {filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle size={48} className="text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No records found</h3>
          <p className="text-muted-foreground">Try adjusting your filters to see more results.</p>
        </div>
      ) : (
        <>
          <Dialog open={Boolean(selectedRecordData)} onOpenChange={(open) => !open && setSelectedRecord(null)}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              {selectedRecordData && (
                <div className="space-y-5">
                  <DialogHeader className="space-y-3 text-left">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar size={14} />
                          {new Date(selectedRecordData.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <DialogTitle className="font-display text-2xl text-foreground">
                          {selectedRecordData.title}
                        </DialogTitle>
                        <DialogDescription className="text-base font-medium text-primary">
                          {selectedRecordData.diagnosis}
                        </DialogDescription>
                      </div>
                      <Badge className={cn('w-fit text-xs px-2 py-1', severityColors[selectedRecordData.severity])}>
                        {selectedRecordData.severity}
                      </Badge>
                    </div>
                  </DialogHeader>

                  <div className="rounded-xl border border-border bg-secondary/30 p-4">
                    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground">
                      {selectedRecordData.description}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-start gap-2 text-sm">
                      <Stethoscope size={16} className="mt-0.5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">{selectedRecordData.doctor}</p>
                        <p className="text-muted-foreground">Doctor</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-sm">
                      <MapPin size={16} className="mt-0.5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">{selectedRecordData.hospital}</p>
                        <p className="text-muted-foreground">Hospital</p>
                      </div>
                    </div>
                  </div>

                  {selectedRecordData.department && (
                    <div className="text-sm">
                      <p className="font-medium text-foreground">{selectedRecordData.department}</p>
                      <p className="text-muted-foreground">Department</p>
                    </div>
                  )}

                  {selectedRecordData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedRecordData.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {selectedRecordData.attachments && selectedRecordData.attachments.length > 0 && (
                    <div className="rounded-lg border border-border bg-secondary/40 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Paperclip size={14} className="text-primary" />
                        <span className="text-sm font-medium text-foreground">Uploaded Files</span>
                      </div>
                      <div className="space-y-2">
                        {selectedRecordData.attachments.map((attachment, attachmentIndex) => (
                          <a
                            key={`${selectedRecordData.id}-attachment-${attachmentIndex}`}
                            href={attachment.accessUrl || '#'}
                            target="_blank"
                            rel="noreferrer"
                            aria-disabled={!attachment.accessUrl}
                            className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm text-primary hover:bg-accent/40"
                          >
                            <span className="truncate">
                              {attachment.fileName || `Attachment ${attachmentIndex + 1}`}
                            </span>
                            <ExternalLink size={14} className="shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Vertical Timeline */}
          <div className="relative pb-20">
            {/* Timeline line */}
            <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-6">
              {filteredRecords.map((record, index) => {
                const Icon = iconMap[index % iconMap.length];
                const colorClass = colorMap[index % colorMap.length];
                const isSelected = selectedRecord === record.id;

                return (
                  <div
                    key={record.id}
                    className="relative pl-12 animate-slide-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Timeline dot */}
                    <div className={cn(
                      'absolute left-0 top-2 w-9 h-9 rounded-full flex items-center justify-center border-4 bg-card z-10',
                      colorClass
                    )}>
                      <Icon size={16} />
                    </div>

                    {/* Record card */}
                    <button
                      onClick={() => setSelectedRecord(record.id)}
                      className={cn(
                        'medical-card w-full text-left transition-all',
                        isSelected && 'ring-2 ring-primary'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar size={12} />
                          {new Date(record.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <Badge className={cn('text-[10px] px-1.5 py-0', severityColors[record.severity])}>
                          {record.severity}
                        </Badge>
                      </div>

                      <h3 className="font-display text-lg text-foreground mb-1">{record.title}</h3>
                      <p className="text-sm text-primary font-medium mb-2">{record.diagnosis}</p>
                      <p className="overflow-hidden text-sm text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                        {record.description}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                        <div className="flex flex-wrap gap-1">
                          {record.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <span className="text-xs font-medium text-primary">
                          Click to view full details
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
