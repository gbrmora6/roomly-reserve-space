
import { TableCell, TableRow } from "@/components/ui/table";

export const EmptyBookings = () => {
  return (
    <TableRow>
      <TableCell colSpan={7} className="text-center py-4">
        Nenhuma reserva encontrada
      </TableCell>
    </TableRow>
  );
};
