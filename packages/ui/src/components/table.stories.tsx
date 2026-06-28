import type { Meta, StoryObj } from "@storybook/react-vite";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

const meta = {
  title: "UI/Table",
  component: Table,
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof Table>;

const INVOICES = [
  { id: "INV001", status: "Paid", total: "$250.00" },
  { id: "INV002", status: "Pending", total: "$150.00" },
  { id: "INV003", status: "Unpaid", total: "$350.00" },
];

export const Default: Story = {
  render: () => (
    <Table className="max-w-md">
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {INVOICES.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">{row.id}</TableCell>
            <TableCell>{row.status}</TableCell>
            <TableCell className="text-right">{row.total}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};
