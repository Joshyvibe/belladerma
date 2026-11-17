import Link from "next/link";
import { ProductForm } from "../ProductForm";

export default function NewProduct() {
  return (
    <div className="space-y-4">
      <Link href="/admin/products" className="text-sm text-muted">← Products</Link>
      <h1 className="text-4xl">Add product</h1>
      <ProductForm />
    </div>
  );
}
