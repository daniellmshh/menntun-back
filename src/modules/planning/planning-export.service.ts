import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RequestUser } from '../../common/types';

@Injectable()
export class PlanningExportService {
  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async generateHtml(id: string, user: RequestUser): Promise<string> {
    const planning = await this.prisma.planning.findUnique({
      where: { id },
      include: {
        teacherProfile: { include: { user: true } },
        group: { include: { grade: true } },
        subject: true,
      },
    });

    if (!planning) throw new NotFoundException('Planeación no encontrada');

    // Access control
    if (user.role === 'TEACHER' && planning.teacherProfile.user.id !== user.id) {
      throw new NotFoundException('Planeación no encontrada');
    }

    const gradeOrder = planning.isStandalone 
      ? planning.standaloneGradeOrder 
      : planning.group?.grade?.order || 1;
    const levelName = planning.isStandalone 
      ? planning.standaloneLevel 
      : planning.group?.grade?.level || 'PREESCOLAR';

    const renderArray = (arr: string[]) => arr.map(item => `<li>${item}</li>`).join('');

    const fundamentacion = (planning.fundamentacion as any[]) || [];
    const matrizDidactica = (planning.matrizDidactica as any[]) || [];
    const ejesArticuladores = planning.ejesArticuladores || [];
    
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Planeación - ${planning.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
    
    body {
      font-family: 'Outfit', sans-serif;
      color: #1a1a1a;
      line-height: 1.5;
      margin: 0;
      padding: 20px;
      background: #fff;
    }
    
    @media print {
      @page {
        size: letter landscape;
        margin: 15mm;
      }
      body {
        padding: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .page-break {
        page-break-before: always;
      }
      table {
        page-break-inside: auto;
      }
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      thead {
        display: table-header-group;
      }
      tfoot {
        display: table-footer-group;
      }
    }

    .header-box {
      border: 2px solid #2d3748;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      background: #f7fafc;
    }

    h1, h2, h3, h4 {
      margin-top: 0;
      color: #2d3748;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      font-size: 13px;
    }

    .section-title {
      background: #4a5568;
      color: white;
      padding: 8px 12px;
      font-size: 14px;
      font-weight: bold;
      border-radius: 4px;
      margin: 20px 0 10px 0;
      text-transform: uppercase;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12px;
    }

    th, td {
      border: 1px solid #cbd5e0;
      padding: 8px;
      vertical-align: top;
    }

    th {
      background: #edf2f7;
      font-weight: 600;
      text-align: left;
    }

    .table-title {
      background: #e2e8f0;
      font-weight: bold;
      text-align: center;
      padding: 10px;
      font-size: 14px;
    }

    ul {
      margin: 0;
      padding-left: 15px;
    }

    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }

    .badge {
      background: #edf2f7;
      border: 1px solid #cbd5e0;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
    }

    .text-sm { font-size: 12px; }
    .text-xs { font-size: 11px; }
    .bold { font-weight: bold; }
    .italic { font-style: italic; }
    
    .pre-wrap { white-space: pre-wrap; }
  </style>
</head>
<body>

  <div class="header-box">
    <h2 style="margin-bottom: 10px; text-align: center;">${planning.title}</h2>
    <div class="meta-grid">
      <div><span class="bold">Docente:</span> ${planning.teacherProfile.user.firstName} ${planning.teacherProfile.user.lastName}</div>
      <div><span class="bold">Nivel:</span> ${levelName} - ${gradeOrder}° Grado</div>
      <div><span class="bold">Periodo:</span> ${planning.periodoProyecto || '-'}</div>
      <div><span class="bold">Modalidad:</span> ${planning.modalidad}</div>
    </div>
  </div>

  <div class="section-title">Contexto y Propósito</div>
  <table>
    <tbody>
      <tr>
        <th width="20%">Problemática</th>
        <td>${planning.problematica || '-'}</td>
      </tr>
      <tr>
        <th>Propósito</th>
        <td>${planning.proposito || '-'}</td>
      </tr>
      <tr>
        <th>Ejes Articuladores</th>
        <td>
          <div class="badges">
            ${ejesArticuladores.map(e => `<span class="badge">${e}</span>`).join('')}
          </div>
        </td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">Fundamentación Curricular</div>
  <table>
    <thead>
      <tr>
        <th width="25%">Campo Formativo</th>
        <th width="35%">Contenido</th>
        <th width="40%">PDA (${gradeOrder}° Grado)</th>
      </tr>
    </thead>
    <tbody>
      ${fundamentacion.map(f => `
        <tr>
          <td class="bold">${f.nombreCampo || f.campoFormativo}</td>
          <td>${f.contenido}</td>
          <td class="italic">${f.pda}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="section-title">Matriz Didáctica por Momentos</div>
  ${matrizDidactica.map(momento => `
    <table>
      <thead>
        <tr>
          <td colspan="5" class="table-title">${momento.momento}</td>
        </tr>
        <tr>
          <th width="30%">Actividades</th>
          <th width="25%">Campo y PDA</th>
          <th width="15%">Organización</th>
          <th width="15%">Recursos</th>
          <th width="15%">Evaluación</th>
        </tr>
      </thead>
      <tbody>
        ${(momento.filas || []).map(fila => `
          <tr>
            <td class="pre-wrap">${fila.actividades}</td>
            <td class="pre-wrap text-xs">${fila.campo_pda}</td>
            <td class="pre-wrap">${fila.organizacion}</td>
            <td class="pre-wrap">${fila.recursos}</td>
            <td class="pre-wrap">${fila.evaluacion}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `).join('')}

  <div class="section-title">Consideraciones Adicionales</div>
  <table>
    <tbody>
      <tr>
        <th width="30%">Instrumentos de Evaluación</th>
        <td>
          <ul>${renderArray(planning.instrumentoEvaluacion || [])}</ul>
        </td>
      </tr>
      <tr>
        <th>Ajustes Razonables</th>
        <td>
          <ul>${renderArray(planning.ajustesRazonables || [])}</ul>
        </td>
      </tr>
      <tr>
        <th>Actividades PMC</th>
        <td>
          <ul>${renderArray(planning.actividadesPmc || [])}</ul>
        </td>
      </tr>
    </tbody>
  </table>

</body>
</html>
    `;

    return html;
  }
}
