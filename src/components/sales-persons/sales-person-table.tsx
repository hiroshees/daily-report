import { SalesPersonDeleteButton } from '@/components/sales-persons/sales-person-delete-button'
import { SalesPersonFormDialog } from '@/components/sales-persons/sales-person-form-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type SalesPersonRow = {
  id: number
  name: string
  email: string
  department: string
  is_manager: boolean
}

type SalesPersonTableProps = {
  people: SalesPersonRow[]
  /** ログインユーザーの ID。本人の行は、降格・削除できない */
  currentUserId: number
}

export function SalesPersonTable({ people, currentUserId }: SalesPersonTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>氏名</TableHead>
          <TableHead>メール</TableHead>
          <TableHead>部署</TableHead>
          <TableHead>権限</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">操作</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {people.map((person) => {
          const isSelf = person.id === currentUserId
          return (
            <TableRow key={person.id}>
              <TableCell className="font-medium">{person.name}</TableCell>
              <TableCell>{person.email}</TableCell>
              <TableCell>{person.department}</TableCell>
              <TableCell>
                <Badge variant={person.is_manager ? 'default' : 'outline'}>
                  {person.is_manager ? '管理者' : '一般'}
                </Badge>
              </TableCell>
              <TableCell className="space-x-2 text-right">
                <SalesPersonFormDialog
                  person={person}
                  isSelf={isSelf}
                  trigger={
                    <Button variant="outline" size="sm" aria-label={`${person.name}を編集`}>
                      編集
                    </Button>
                  }
                />
                <SalesPersonDeleteButton personId={person.id} name={person.name} isSelf={isSelf} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
