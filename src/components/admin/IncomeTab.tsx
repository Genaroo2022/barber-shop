import { useEffect, useState } from "react";
import { DollarSign, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getAdminIncome, type IncomeBreakdownItem } from "@/lib/api";
import { buildCsv, downloadCsv } from "@/lib/csv";

const IncomeTab = () => {
  const [totalIncome, setTotalIncome] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [breakdown, setBreakdown] = useState<IncomeBreakdownItem[]>([]);

  useEffect(() => {
    const fetchIncome = async () => {
      try {
        const data = await getAdminIncome();
        setTotalIncome(Number(data.totalIncome) || 0);
        setMonthlyIncome(Number(data.monthlyIncome) || 0);
        setBreakdown(
          data.breakdown.map((item) => ({
            ...item,
            total: Number(item.total) || 0,
          }))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al cargar ingresos";
        toast.error(message);
      }
    };
    fetchIncome();
  }, []);

  const formatPrice = (n: number) => `$${n.toLocaleString("es-AR")}`;

  const exportIncomeCsv = () => {
    const summaryRows: Array<Array<string | number>> = [
      ["Ingreso total", totalIncome],
      ["Ingreso del mes", monthlyIncome],
    ];

    const breakdownRows = breakdown.map((item) => [item.serviceName, item.count, item.total]);
    const summaryCsv = buildCsv(["Concepto", "Valor"], summaryRows);
    const breakdownCsv = buildCsv(["Servicio", "Cantidad", "Total"], breakdownRows);
    const csv = `${summaryCsv}\n\n${breakdownCsv}`;

    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    downloadCsv(`ingresos_${stamp}.csv`, csv);
    toast.success("CSV de ingresos descargado");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportIncomeCsv}>
          <Download className="w-4 h-4 mr-2" />
          Descargar CSV
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-6 gold-border-glow">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Ingreso total</span>
          </div>
          <p className="text-3xl font-display font-bold gold-text">{formatPrice(totalIncome)}</p>
        </div>
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-5 h-5 text-green-500" />
            <span className="text-sm text-muted-foreground">Ingreso del mes</span>
          </div>
          <p className="text-3xl font-display font-bold">{formatPrice(monthlyIncome)}</p>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="font-display font-semibold mb-4">Desglose por servicio</h3>
        {breakdown.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay ingresos registrados</p>
        ) : (
          <div className="space-y-3">
            {breakdown.map((item) => (
              <div
                key={item.serviceName}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
              >
                <div>
                  <p className="font-medium text-sm">{item.serviceName}</p>
                  <p className="text-xs text-muted-foreground">{item.count} servicios realizados</p>
                </div>
                <p className="font-display font-semibold gold-text">{formatPrice(item.total)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IncomeTab;
