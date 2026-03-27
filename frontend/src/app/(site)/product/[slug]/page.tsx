import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props {
  params: { slug: string };
}

export async function generateMetadata(_: Props): Promise<Metadata> {
  return { title: "Не найдено" };
}

export default async function ProductPage(_: Props) {
  notFound();
}
