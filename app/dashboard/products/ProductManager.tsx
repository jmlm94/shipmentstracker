"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProductManager() {
  const router = useRouter();
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [tier, setTier] = useState("A");
  const [unitsPerBox, setUnitsPerBox] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku,
        name,
        tier,
        unitsPerBox: unitsPerBox === "" ? null : Number(unitsPerBox),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSku("");
      setName("");
      setUnitsPerBox("");
      setTier("A");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not add product");
    }
  }

  return (
    <form onSubmit={add} className="card p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <label className="label">SKU / Product ID *</label>
          <input className="input" value={sku} onChange={(e) => setSku(e.target.value)} />
        </div>
        <div>
          <label className="label">Product name *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Tier</label>
          <select className="input" value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="A">Tier A</option>
            <option value="B">Tier B</option>
            <option value="C">Tier C</option>
          </select>
        </div>
        <div>
          <label className="label">Units / box</label>
          <input
            className="input"
            type="number"
            min={1}
            value={unitsPerBox}
            onChange={(e) => setUnitsPerBox(e.target.value)}
            placeholder="optional"
          />
        </div>
      </div>
      {error && <p className="err mt-2">{error}</p>}
      <div className="mt-3">
        <button className="btn" disabled={saving}>
          {saving ? "Adding…" : "Add product"}
        </button>
      </div>
    </form>
  );
}
