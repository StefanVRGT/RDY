'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateSchwerpunktebeneDialog } from './create-schwerpunktebene-dialog';
import { EditSchwerpunktebeneDialog } from './edit-schwerpunktebene-dialog';
import { DeleteSchwerpunktebeneDialog } from './delete-schwerpunktebene-dialog';

type MonthFilter = 'all' | '1' | '2' | '3';
type SortBy = 'monthNumber' | 'titleDe' | 'createdAt';
type SortOrder = 'asc' | 'desc';

interface Schwerpunktebene {
  id: string;
  monthNumber: string;
  titleDe: string;
  titleEn: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  herkunftDe: string | null;
  herkunftEn: string | null;
  zielDe: string | null;
  zielEn: string | null;
  imageUrl: string | null;
}

export function SchwerpunktebenenManagement() {
  const router = useRouter();
  const [monthFilter, setMonthFilter] = useState<MonthFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('monthNumber');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSchwerpunktebene, setEditingSchwerpunktebene] = useState<Schwerpunktebene | null>(
    null
  );
  const [deletingSchwerpunktebene, setDeletingSchwerpunktebene] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.schwerpunktebenen.list.useQuery({
    monthNumber: monthFilter,
    sortBy,
    sortOrder,
    page,
    limit: 20,
  });

  const getMonthLabel = (monthNumber: string) => {
    switch (monthNumber) {
      case '1':
        return 'Month 1';
      case '2':
        return 'Month 2';
      case '3':
        return 'Month 3';
      default:
        return monthNumber;
    }
  };

  const getMonthBadgeClass = (monthNumber: string) => {
    switch (monthNumber) {
      case '1':
        return 'bg-rdy-orange-500/10 text-rdy-orange-500';
      case '2':
        return 'bg-rdy-orange-500/10 text-rdy-orange-500';
      case '3':
        return 'bg-rdy-orange-500/10 text-green-400';
      default:
        return 'bg-rdy-gray-100/30 text-rdy-gray-400';
    }
  };

  const truncateText = (text: string | null, maxLength: number = 50) => {
    if (!text) return '-';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-500">
        Error loading focus areas: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create button */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Select
            value={monthFilter}
            onValueChange={(value: MonthFilter) => {
              setMonthFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent className="border-rdy-gray-200 bg-rdy-gray-100">
              <SelectItem value="all" className="text-rdy-black">
                All Months
              </SelectItem>
              <SelectItem value="1" className="text-rdy-black">
                Month 1
              </SelectItem>
              <SelectItem value="2" className="text-rdy-black">
                Month 2
              </SelectItem>
              <SelectItem value="3" className="text-rdy-black">
                Month 3
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
            <SelectTrigger className="w-[140px] border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="border-rdy-gray-200 bg-rdy-gray-100">
              <SelectItem value="monthNumber" className="text-rdy-black">
                Month
              </SelectItem>
              <SelectItem value="titleDe" className="text-rdy-black">
                Title
              </SelectItem>
              <SelectItem value="createdAt" className="text-rdy-black">
                Created
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={(value: SortOrder) => setSortOrder(value)}>
            <SelectTrigger className="w-[100px] border-rdy-gray-200 bg-rdy-gray-100 text-rdy-black">
              <SelectValue placeholder="Order" />
            </SelectTrigger>
            <SelectContent className="border-rdy-gray-200 bg-rdy-gray-100">
              <SelectItem value="asc" className="text-rdy-black">
                Asc
              </SelectItem>
              <SelectItem value="desc" className="text-rdy-black">
                Desc
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>Add Focus Area</Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-rdy-gray-200 bg-rdy-gray-100">
        <Table>
          <TableHeader>
            <TableRow className="border-rdy-gray-200 hover:bg-transparent">
              <TableHead className="text-rdy-gray-400">Month</TableHead>
              <TableHead className="text-rdy-gray-400">Title (DE)</TableHead>
              <TableHead className="text-rdy-gray-400">Title (EN)</TableHead>
              <TableHead className="text-rdy-gray-400">Goal (DE)</TableHead>
              <TableHead className="text-rdy-gray-400">Image</TableHead>
              <TableHead className="text-right text-rdy-gray-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-rdy-gray-400">
                  Loading...
                </TableCell>
              </TableRow>
            ) : !data?.schwerpunktebenen?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-rdy-gray-400">
                  No focus areas found
                </TableCell>
              </TableRow>
            ) : (
              data.schwerpunktebenen.map((schwerpunktebene) => (
                <TableRow key={schwerpunktebene.id} className="border-rdy-gray-200">
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getMonthBadgeClass(schwerpunktebene.monthNumber)}`}
                    >
                      {getMonthLabel(schwerpunktebene.monthNumber)}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-rdy-black">
                    {schwerpunktebene.titleDe}
                  </TableCell>
                  <TableCell className="text-rdy-gray-400">
                    {schwerpunktebene.titleEn || '-'}
                  </TableCell>
                  <TableCell className="text-rdy-gray-400">
                    {truncateText(schwerpunktebene.zielDe)}
                  </TableCell>
                  <TableCell className="text-rdy-gray-400">
                    {schwerpunktebene.imageUrl ? (
                      <span className="text-green-400">Yes</span>
                    ) : (
                      <span className="text-rdy-gray-500">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/admin/weeks?schwerpunktebeneId=${schwerpunktebene.id}`
                          )
                        }
                        className="text-rdy-orange-500 hover:text-rdy-orange-500"
                      >
                        Weeks
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSchwerpunktebene(schwerpunktebene)}
                        className="text-rdy-gray-400 hover:text-rdy-black"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDeletingSchwerpunktebene({
                            id: schwerpunktebene.id,
                            title: schwerpunktebene.titleDe,
                          })
                        }
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-rdy-gray-400">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.pagination.total)} of{' '}
            {data.pagination.total} focus areas
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page === data.pagination.totalPages}
              className="border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <CreateSchwerpunktebeneDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          utils.schwerpunktebenen.list.invalidate();
          setShowCreateDialog(false);
        }}
      />

      {/* Edit Dialog */}
      <EditSchwerpunktebeneDialog
        open={!!editingSchwerpunktebene}
        onOpenChange={(open) => {
          if (!open) setEditingSchwerpunktebene(null);
        }}
        schwerpunktebene={editingSchwerpunktebene}
        onSuccess={() => {
          utils.schwerpunktebenen.list.invalidate();
          setEditingSchwerpunktebene(null);
        }}
      />

      {/* Delete Dialog */}
      <DeleteSchwerpunktebeneDialog
        open={!!deletingSchwerpunktebene}
        onOpenChange={(open) => {
          if (!open) setDeletingSchwerpunktebene(null);
        }}
        schwerpunktebene={deletingSchwerpunktebene}
        onSuccess={() => {
          utils.schwerpunktebenen.list.invalidate();
          setDeletingSchwerpunktebene(null);
        }}
      />
    </div>
  );
}
