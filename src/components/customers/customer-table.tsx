import { CustomerDeleteButton } from '@/components/customers/customer-delete-button'
import { CustomerFormDialog } from '@/components/customers/customer-form-dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type CustomerRow = {
  id: number
  company_name: string
  contact_person: string | null
  phone: string | null
}

export function CustomerTable({ customers }: { customers: CustomerRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>会社名</TableHead>
          <TableHead>担当者</TableHead>
          <TableHead>電話</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">操作</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.id}>
            <TableCell className="font-medium">{customer.company_name}</TableCell>
            <TableCell>{customer.contact_person ?? '-'}</TableCell>
            <TableCell>{customer.phone ?? '-'}</TableCell>
            <TableCell className="space-x-2 text-right">
              <CustomerFormDialog
                customerId={customer.id}
                trigger={
                  <Button variant="outline" size="sm" aria-label={`${customer.company_name}を編集`}>
                    編集
                  </Button>
                }
              />
              <CustomerDeleteButton customerId={customer.id} companyName={customer.company_name} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
