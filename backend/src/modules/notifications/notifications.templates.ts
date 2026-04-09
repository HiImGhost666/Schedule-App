import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function formatDt(dt: Date | string) {
  return format(new Date(dt), "EEEE dd/MM/yyyy 'a las' HH:mm", { locale: es });
}

export function buildScheduleCard(params: {
  type: string;
  title: string;
  startDatetime: Date | string;
  endDatetime: Date | string;
  assignees: string[];
  location?: string | null;
  reason: string;
  actor: string;
  isLastMinute: boolean;
}) {
  const typeLabels: Record<string, string> = {
    schedule_created: '✅ NUEVA GUARDIA PROGRAMADA',
    schedule_modified: '✏️ GUARDIA MODIFICADA',
    schedule_deleted: '🗑️ GUARDIA ELIMINADA',
    schedule_lastminute: '⚠️ CAMBIO DE ÚLTIMO MOMENTO',
  };

  const titleText = typeLabels[params.type] || '📅 ACTUALIZACIÓN DE GUARDIA';
  const color = params.isLastMinute ? 'attention' : params.type === 'schedule_created' ? 'good' : 'warning';

  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: titleText,
              size: 'Large',
              weight: 'Bolder',
              color,
              wrap: true,
            },
            params.isLastMinute
              ? {
                  type: 'TextBlock',
                  text: '⚠️ Este cambio se ha realizado con menos de 24 horas de antelación',
                  color: 'attention',
                  isSubtle: true,
                  wrap: true,
                }
              : null,
            {
              type: 'FactSet',
              facts: [
                { title: '📋 Guardia:', value: params.title },
                { title: '🕐 Inicio:', value: formatDt(params.startDatetime) },
                { title: '🕕 Fin:', value: formatDt(params.endDatetime) },
                { title: '👥 Personal:', value: params.assignees.join(', ') || 'Sin asignar' },
                ...(params.location ? [{ title: '📍 Ubicación:', value: params.location }] : []),
                { title: '📝 Motivo:', value: params.reason },
                { title: '👤 Modificado por:', value: params.actor },
              ].filter(Boolean),
            },
          ].filter(Boolean),
          msteams: { width: 'Full' },
        },
      },
    ],
  };
}

export function buildFridaySummaryCard(params: {
  weekLabel: string;
  days: Array<{
    dayLabel: string;
    schedules: Array<{ title: string; time: string; assignees: string[]; location?: string | null }>;
  }>;
}) {
  const dayBlocks = params.days.flatMap((day) => {
    if (day.schedules.length === 0) return [];
    return [
      {
        type: 'TextBlock',
        text: `📅 **${day.dayLabel}**`,
        weight: 'Bolder',
        size: 'Medium',
        spacing: 'Medium',
        color: 'accent',
      },
      ...day.schedules.map((s) => ({
        type: 'FactSet',
        facts: [
          { title: '📋 Guardia:', value: s.title },
          { title: '🕐 Horario:', value: s.time },
          { title: '👥 Personal:', value: s.assignees.join(', ') || 'Sin asignar' },
          ...(s.location ? [{ title: '📍 Lugar:', value: s.location }] : []),
        ],
      })),
      { type: 'Separator' },
    ];
  });

  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: `📊 PLANIFICACIÓN DE LA SEMANA`,
              size: 'ExtraLarge',
              weight: 'Bolder',
              color: 'accent',
            },
            {
              type: 'TextBlock',
              text: params.weekLabel,
              size: 'Medium',
              isSubtle: true,
              wrap: true,
            },
            { type: 'Separator' },
            ...(dayBlocks.length > 0
              ? dayBlocks
              : [{ type: 'TextBlock', text: 'No hay guardias programadas para esta semana.', isSubtle: true }]),
          ],
          msteams: { width: 'Full' },
        },
      },
    ],
  };
}

export function buildMondayVacationCard(params: {
  weekLabel: string;
  vacations: Array<{ name: string; from: string; to: string }>;
}) {
  const bodyBlocks = params.vacations.length > 0
    ? [
        {
          type: 'TextBlock',
          text: `Se ${params.vacations.length === 1 ? 'encuentra' : 'encuentran'} de vacaciones esta semana:`,
          wrap: true,
          isSubtle: true,
          spacing: 'Small',
        },
        {
          type: 'FactSet',
          facts: params.vacations.map((v) => ({
            title: `🏖️ ${v.name}:`,
            value: v.from === v.to ? v.from : `${v.from} – ${v.to}`,
          })),
        },
      ]
    : [
        {
          type: 'TextBlock',
          text: '✅ No hay nadie de vacaciones esta semana.',
          wrap: true,
          color: 'good',
        },
      ];

  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: '🏖️ VACACIONES DE LA SEMANA',
              size: 'ExtraLarge',
              weight: 'Bolder',
              color: 'accent',
            },
            {
              type: 'TextBlock',
              text: params.weekLabel,
              size: 'Medium',
              isSubtle: true,
              wrap: true,
            },
            { type: 'Separator' },
            ...bodyBlocks,
          ],
          msteams: { width: 'Full' },
        },
      },
    ],
  };
}

export function buildTestCard(webhookName: string) {
  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            { type: 'TextBlock', text: '🔔 Mensaje de Prueba', size: 'Large', weight: 'Bolder', color: 'good' },
            { type: 'TextBlock', text: `El webhook **${webhookName}** está correctamente configurado.`, wrap: true },
            { type: 'TextBlock', text: format(new Date(), "dd/MM/yyyy HH:mm:ss"), isSubtle: true, size: 'Small' },
          ],
        },
      },
    ],
  };
}

export function buildAnnouncementCard(message: string, sentBy: string) {
  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            { type: 'TextBlock', text: '📢 Anuncio', size: 'Large', weight: 'Bolder', color: 'accent' },
            { type: 'TextBlock', text: message, wrap: true, size: 'Medium' },
            { type: 'TextBlock', text: `Enviado por: ${sentBy} — ${format(new Date(), "dd/MM/yyyy HH:mm")}`, isSubtle: true, size: 'Small' },
          ],
        },
      },
    ],
  };
}
