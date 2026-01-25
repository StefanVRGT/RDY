'use client';

import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | null;
}

export function TenantFormDialog({ open, onOpenChange, tenantId }: TenantFormDialogProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const isEditing = !!tenantId;

  const { data: tenant, isLoading: isFetching } = trpc.tenants.getById.useQuery(
    { id: tenantId! },
    { enabled: !!tenantId }
  );

  const createMutation = trpc.tenants.create.useMutation({
    onSuccess: () => {
      utils.tenants.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (err) => setError(err.message),
  });

  const updateMutation = trpc.tenants.update.useMutation({
    onSuccess: () => {
      utils.tenants.list.invalidate();
      utils.tenants.getById.invalidate({ id: tenantId! });
      onOpenChange(false);
      resetForm();
    },
    onError: (err) => setError(err.message),
  });

  const resetForm = () => {
    setName('');
    setSlug('');
    setLogoUrl('');
    setPrimaryColor('');
    setSecondaryColor('');
    setError(null);
  };

  useEffect(() => {
    if (tenant && isEditing) {
      setName(tenant.name);
      setSlug(tenant.slug);
      setLogoUrl(tenant.logoUrl || '');
      setPrimaryColor(tenant.primaryColor || '');
      setSecondaryColor(tenant.secondaryColor || '');
    } else if (!open) {
      resetForm();
    }
  }, [tenant, isEditing, open]);

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!isEditing) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const data = {
      name: name.trim(),
      slug: slug.trim(),
      logoUrl: logoUrl.trim() || null,
      primaryColor: primaryColor.trim() || null,
      secondaryColor: secondaryColor.trim() || null,
    };

    if (isEditing) {
      await updateMutation.mutateAsync({ id: tenantId!, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-gray-800 bg-gray-900 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Tenant' : 'Create Tenant'}</DialogTitle>
          <DialogDescription className="text-gray-400">
            {isEditing
              ? 'Update the tenant settings below.'
              : 'Fill in the details to create a new tenant.'}
          </DialogDescription>
        </DialogHeader>

        {isFetching ? (
          <div className="py-8 text-center text-gray-400">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-900/20 p-3 text-sm text-red-400">{error}</div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-300">
                Name *
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Acme Corporation"
                required
                className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="slug" className="text-sm font-medium text-gray-300">
                Slug * <span className="text-gray-500">(URL identifier)</span>
              </label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
                placeholder="acme-corp"
                required
                pattern="^[a-z0-9-]+$"
                className="border-gray-700 bg-gray-800 font-mono text-white placeholder:text-gray-500"
              />
              <p className="text-xs text-gray-500">Lowercase letters, numbers, and hyphens only</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="logoUrl" className="text-sm font-medium text-gray-300">
                Logo URL
              </label>
              <Input
                id="logoUrl"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="primaryColor" className="text-sm font-medium text-gray-300">
                  Primary Color
                </label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#6366f1"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className="flex-1 border-gray-700 bg-gray-800 font-mono text-white placeholder:text-gray-500"
                  />
                  {primaryColor && /^#[0-9A-Fa-f]{6}$/.test(primaryColor) && (
                    <div
                      className="h-9 w-9 rounded border border-gray-700"
                      style={{ backgroundColor: primaryColor }}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="secondaryColor" className="text-sm font-medium text-gray-300">
                  Secondary Color
                </label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#8b5cf6"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className="flex-1 border-gray-700 bg-gray-800 font-mono text-white placeholder:text-gray-500"
                  />
                  {secondaryColor && /^#[0-9A-Fa-f]{6}$/.test(secondaryColor) && (
                    <div
                      className="h-9 w-9 rounded border border-gray-700"
                      style={{ backgroundColor: secondaryColor }}
                    />
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? isEditing
                    ? 'Saving...'
                    : 'Creating...'
                  : isEditing
                    ? 'Save Changes'
                    : 'Create Tenant'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
