import { CreateSupplierForm, SupplierEditor } from "@/components/supplier-forms"
import { loadSuppliers } from "@/lib/data"

export default async function SuppliersPage() {
  const suppliers = await loadSuppliers()

  return (
    <main>
      <p className="text-[12px] uppercase tracking-[0.16em] text-ink-3">Suppliers</p>
      <h1 className="mt-2 text-[32px] font-light tracking-[-0.03em]">Suppliers</h1>
      <p className="mt-2 max-w-xl text-[15px] text-ink-2">Lead time is used when an item is marked ordered and has no lead time of its own.</p>
      <section className="mt-6 rounded-[28px] bg-surface p-6 shadow-[var(--shadow)]">
        <h2 className="text-[18px] font-medium">New supplier</h2>
        <div className="mt-4">
          <CreateSupplierForm />
        </div>
      </section>
      {suppliers.length === 0 ? <p className="mt-8 text-[15px] text-ink-2">No suppliers yet. Add the first one above.</p> : null}
      <ul className="mt-6 grid gap-3">
        {suppliers.map((supplier) => (
          <li key={supplier.id} className="rounded-[24px] bg-surface p-4 shadow-[var(--shadow)]">
            <SupplierEditor supplier={supplier} />
          </li>
        ))}
      </ul>
    </main>
  )
}
