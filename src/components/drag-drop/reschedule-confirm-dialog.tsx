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
        className="max-w-md"
        data-testid="reschedule-confirm-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-rdy-orange-500" />
            Move Exercise
          </DialogTitle>
          <DialogDescription>
            {exerciseTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date change summary */}
          <div className="rounded-lg bg-rdy-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-xs uppercase text-rdy-gray-500">From</p>
                <p className="text-sm font-medium text-rdy-black">
                  {format(fromDate, 'EEE')}
                </p>
                <p className="text-lg font-bold text-rdy-gray-600">
                  {format(fromDate, 'MMM d')}
                </p>
              </div>
              <div className="text-rdy-gray-300">&rarr;</div>
              <div className="text-center">
                <p className="text-xs uppercase text-rdy-gray-500">To</p>
                <p className="text-sm font-medium text-rdy-orange-500">
                  {format(toDate, 'EEE')}
                </p>
                <p className="text-lg font-bold text-rdy-orange-500">
                  {format(toDate, 'MMM d')}
                </p>
              </div>
            </div>
          </div>

          {/* Update options */}
          <div className="space-y-3">
            <p className="text-center text-sm text-rdy-gray-500">
              Would you like to update just this occurrence or all future occurrences?
            </p>

            <div className="flex flex-col gap-2">
              <Button
                onClick={onConfirmSingle}
                disabled={isLoading}
                variant="outline"
                className="flex items-center justify-start gap-3 border-rdy-gray-200 bg-rdy-gray-100 py-6 text-rdy-black hover:bg-rdy-gray-200"
                data-testid="confirm-single-button"
              >
                <CalendarDays className="h-5 w-5 text-rdy-orange-500" />
                <div className="text-left">
                  <p className="font-medium">This occurrence only</p>
                  <p className="text-xs text-rdy-gray-400">
                    Move only this exercise
                  </p>
                </div>
              </Button>

              <Button
                onClick={onConfirmSeries}
                disabled={isLoading}
                variant="outline"
                className="flex items-center justify-start gap-3 border-rdy-gray-200 bg-rdy-gray-100 py-6 text-rdy-black hover:bg-rdy-gray-200"
                data-testid="confirm-series-button"
              >
                <Repeat className="h-5 w-5 text-rdy-orange-500" />
                <div className="text-left">
                  <p className="font-medium">All future occurrences</p>
                  <p className="text-xs text-rdy-gray-400">
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
