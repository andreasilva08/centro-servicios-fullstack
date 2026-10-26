const Pago = require('../models/Pago');

// La caja reconocida se calcula exclusivamente con pagos aprobados.
// Los reembolsos se exponen aparte y nunca se suman a los ingresos.
async function getFinancialMetrics() {
  const byState = await Pago.aggregate([
    {
      $group: {
        _id: '$estadoPago',
        cantidad: { $sum: 1 },
        montoCOP: { $sum: { $ifNull: ['$monto', 0] } }
      }
    }
  ]);
  const states = Object.fromEntries(byState.map(item => [item._id, item]));
  const amount = state => Number(states[state]?.montoCOP || 0);
  const count = state => Number(states[state]?.cantidad || 0);
  const pending = byState
    .filter(item => item._id === 'Pendiente' || item._id?.startsWith('Pendiente de '))
    .reduce((totals, item) => ({ cantidad: totals.cantidad + item.cantidad, montoCOP: totals.montoCOP + item.montoCOP }), { cantidad: 0, montoCOP: 0 });

  return {
    ingresosCOP: amount('Aprobado'),
    reembolsosCOP: amount('Reembolsado'),
    pagosAprobados: count('Aprobado'),
    pagosReembolsados: count('Reembolsado'),
    montoPendienteCOP: Number(pending.montoCOP || 0),
    pagosPendientes: Number(pending.cantidad || 0),
    pagosRechazados: count('Rechazado')
  };
}

module.exports = { getFinancialMetrics };
