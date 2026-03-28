import type { Metadata } from "next";
import TrackOrderClient from "./TrackOrderClient";

export const metadata: Metadata = {
  title: "Отслеживание заказа",
};

interface Props {
  params: { token: string };
}

export default function TrackPage({ params }: Props) {
  return <TrackOrderClient token={params.token} />;
}
