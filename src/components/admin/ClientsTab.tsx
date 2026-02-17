import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listAdminClients, type ClientSummary } from "@/lib/api";

const ClientsTab = () => {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const data = await listAdminClients();
        setClients(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al cargar clientes";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  if (loading) return <div className="text-muted-foreground">Cargando clientes...</div>;

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground">Nombre</TableHead>
            <TableHead className="text-muted-foreground">Telefono</TableHead>
            <TableHead className="text-muted-foreground">Turnos totales</TableHead>
            <TableHead className="text-muted-foreground">Ultima visita</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                No hay clientes registrados
              </TableCell>
            </TableRow>
          ) : (
            clients.map((client) => (
              <TableRow key={client.clientPhone} className="border-border">
                <TableCell className="font-medium">{client.clientName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{client.clientPhone}</TableCell>
                <TableCell className="text-sm">{client.totalAppointments}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{client.lastVisit}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default ClientsTab;
