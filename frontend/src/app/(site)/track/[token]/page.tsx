import type { Metadata } from "next";
import TrackOrderClient from "./TrackOrderClient";

export const metadata: Metadata = {
  title: "Отслеживание заказа",
};

interface Props {
  params: { token: string };
  searchParams?: { paid?: string | string[] };
}

export default function TrackPage({ params, searchParams }: Props) {
  const paidParam = Array.isArray(searchParams?.paid)
    ? searchParams?.paid[0]
    : searchParams?.paid;
  const returnedFromPaidStripe = paidParam === "1";

  return <TrackOrderClient token={params.token} initialPaid={returnedFromPaidStripe} />;
}
