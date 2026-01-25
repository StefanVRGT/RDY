'use client';

import { format } from 'date-fns';
import { Calendar, Repeat, CalendarDays } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface RescheduleConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseTitle: string;
  fromDate: Date;
  toDate: Date;
  onConfirmSingle: () => void;
  onConfirmSeries: () => void;
  isLoading?: boolean;
}

export function RescheduleConfirmDialog({
  open,
  onOpenChange,
  exerciseTitle,
  fromDate,
  toDate,
  onConfirmSingle,
  onConfirmSeries,
  isLoading = false,
}: RescheduleConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md bg-gray-900"
        data-testid="reschedule-confirm-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Calendar className="h-5 w-5 text-twilight-400" />
            Move Exercise
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {exerciseTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date change summary */}
          <div className="rounded-lg bg-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-xs uppercase text-gray-500">From</p>
                <p className="text-sm font-medium text-white">
                  {format(fromDate, 'EEE')}
                </p>
                <p className="text-lg font-bold text-gray-300">
                  {format(fromDate, 'MMM d')}
                </p>
              </div>
              <div className="text-gray-600">→</div>
              <div className="text-center">
                <p className="text-xs uppercase text-gray-500">To</p>
                <p className="text-sm font-medium text-twilight-400">
                  {format(toDate, 'EEE')}
                </p>
                <p className="text-lg font-bold text-twilight-300">
                  {format(toDate, 'MMM d')}
                </p>
              </div>
            </div>
          </div>

          {/* Update options */}
          <div className="space-y-3">
            <p className="text-center text-sm text-gray-400">
              Would you like to update just this occurrence or all future occurrences?
            </p>

            <div className="flex flex-col gap-2">
              <Button
                onClick={onConfirmSingle}
                disabled={isLoading}
                variant="outline"
                className="flex items-center justify-start gap-3 border-gray-700 bg-gray-800 py-6 text-white hover:bg-gray-700"
                data-testid="confirm-single-button"
              >
                <CalendarDays className="h-5 w-5 text-twilight-400" />
                <div className="text-left">
                  <p className="font-medium">This occurrence only</p>
                  <p className="text-xs text-gray-400">
                    Move only this exercise
                  </p>
                </div>
              </Button>

              <Button
                onClick={onConfirmSeries}
                disabled={isLoading}
                variant="outline"
                className="flex items-center justify-start gap-3 border-gray-700 bg-gray-800 py-6 text-white hover:bg-gray-700"
                data-testid="confirm-series-button"
              >
                <Repeat className="h-5 w-5 text-twilight-400" />
                <div className="text-left">
                  <p className="font-medium">All future occurrences</p>
                  <p className="text-xs text-gray-400">
                    Shift this and all upcoming exercises
                  </p>
                </div>
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            data-testid="cancel-reschedule-button"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
