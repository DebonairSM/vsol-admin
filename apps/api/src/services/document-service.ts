import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { TerminationService } from './termination-service';
import { EquipmentService } from './equipment-service';

export class DocumentService {
  static async generateTerminationContract(consultantId: number): Promise<Buffer> {
    // Validate termination data and get consultant info
    const { consultant, equipment } = await TerminationService.validateTerminationData(consultantId);

    // Create PDF document
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Set font
    doc.setFont('helvetica');
    
    let yPosition = 20;
    const lineHeight = 8;
    const pageWidth = 210;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('DISTRATO DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += lineHeight * 2;

    // Reset font for body text
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    // First paragraph - Parties
    const firstPartyText = `Pelo presente instrumento particular de um lado ${consultant.name.toUpperCase()}, brasileiro, casado, portador do CPF nº ${consultant.cpf || 'N/A'}, residente e domiciliado na ${consultant.address || 'endereço não informado'}, com empresa ${consultant.companyLegalName || consultant.companyTradeName || 'N/A'}, CNPJ: ${consultant.cnpj || 'N/A'}, doravante denominado PRIMEIRA DISTRATANTE, e de outro lado VSOL SOFTWARE, 3111 N University Dr. Ste 105 - Coral Springs, FL 33065, doravante simplesmente denominada SEGUNDA DISTRATANTE, têm entre si certo e ajustado a rescisão de contrato escrito de representação comercial nas seguintes condições:`;

    const firstPartyLines = doc.splitTextToSize(firstPartyText, contentWidth);
    doc.text(firstPartyLines, margin, yPosition);
    yPosition += firstPartyLines.length * lineHeight + 10;

    // Clause 1 - Contract termination
    doc.setFont('helvetica', 'bold');
    doc.text('CLÁUSULA PRIMEIRA –', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    
    const clause1Text = ` Pelo presente, as partes rescindem contrato de prestação de serviços verbal com início em ${format(consultant.startDate, 'dd/MM/yyyy')} com sua área de atuação na consultoria de serviços de desenvolvimento de software vigente até a data de ${format(consultant.terminationDate!, 'dd/MM/yyyy')}.`;
    const clause1Lines = doc.splitTextToSize(clause1Text, contentWidth - 30);
    doc.text(clause1Lines, margin + 30, yPosition);
    yPosition += clause1Lines.length * lineHeight + 10;

    // Clause 2 - Final payment
    doc.setFont('helvetica', 'bold');
    doc.text('CLÁUSULA SEGUNDA –', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    
    const finalPaymentFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(consultant.finalPaymentAmount || 0);

    const clause2Text = ` A Primeira Distratante receberá através de depósito bancário a quantia de ${finalPaymentFormatted} como pagamento pelos serviços prestados até a data do distrato, declarando para todos os fins, que nada mais tem a receber referente aos serviços prestados nos meses anteriores, servindo o presente como recibo de quitação total.`;
    const clause2Lines = doc.splitTextToSize(clause2Text, contentWidth - 30);
    doc.text(clause2Lines, margin + 30, yPosition);
    yPosition += clause2Lines.length * lineHeight + 10;

    // Clause 3 - Payment terms and equipment return
    doc.setFont('helvetica', 'bold');
    doc.text('CLÁUSULA TERCEIRA –', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    
    const clause3Text = ` Fica ajustado que o pagamento será realizado após 05 (cinco) dias do recebimento pela SEGUNDA DISTRATANTE do presente Termo de Rescisão de Contrato de Representação Comercial devidamente assinado, através de depósito pelo sistema fintech Payoneer (www.payoneer.com) de titularidade da PRIMEIRA DISTRATANTE. Recaindo o vencimento em finais de semana ou feriado, fica automaticamente prorrogado o prazo para o primeiro dia útil subsequente.`;
    const clause3Lines = doc.splitTextToSize(clause3Text, contentWidth - 30);
    doc.text(clause3Lines, margin + 30, yPosition);
    yPosition += clause3Lines.length * lineHeight + 10;

    // Equipment return paragraph
    doc.setFont('helvetica', 'bold');
    doc.text('Parágrafo Primeiro -', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    
    const equipmentReturnDate = consultant.equipmentReturnDeadline 
      ? format(consultant.equipmentReturnDeadline, 'dd/MM/yyyy')
      : format(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), 'dd/MM/yyyy'); // 5 days from now

    const paragraph1Text = ` A Primeira Distratante se compromete a devolver à Segunda Distratante a relação de equipamentos abaixo, no prazo até ${equipmentReturnDate}, a ser despachado devidamente acondicionado e embalado com plástico bolha, assim como com a proteção que o equipamento exige, mediante entrega aos cuidados da Transportadora JADLOG com endereço de destinatário a Rua Jones Fraga, 149, Morro Grande, Sangão, SC, Cep: 88.717-000, aos cuidados de Maria Luiza Tibúrcio:`;
    const paragraph1Lines = doc.splitTextToSize(paragraph1Text, contentWidth - 30);
    doc.text(paragraph1Lines, margin + 30, yPosition);
    yPosition += paragraph1Lines.length * lineHeight + 10;

    // Equipment list
    if (equipment.length > 0) {
      equipment.forEach((item, index) => {
        const equipmentText = `${index + 1}. Device Name or Description ${item.deviceName}${item.model ? `, Model ${item.model}` : ''}${item.purchaseDate ? `, Purchase Date ${format(item.purchaseDate, 'yyyy-MM-dd')}` : ''}${item.serialNumber ? `, Serial Number ${item.serialNumber}` : ''}.`;
        doc.text(equipmentText, margin + 10, yPosition);
        yPosition += lineHeight;
      });
    } else {
      doc.text('Nenhum equipamento registrado para devolução.', margin + 10, yPosition);
      yPosition += lineHeight;
    }
    
    yPosition += 10;

    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Additional paragraphs
    doc.setFont('helvetica', 'bold');
    doc.text('Parágrafo Segundo –', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const paragraph2Text = ` O não cumprimento da obrigação acima, gera em favor da Segunda Distratante o direito de cobrar da Primeira Distratante o valor constante nas notas fiscais dos referidos produtos.`;
    const paragraph2Lines = doc.splitTextToSize(paragraph2Text, contentWidth - 30);
    doc.text(paragraph2Lines, margin + 30, yPosition);
    yPosition += paragraph2Lines.length * lineHeight + 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Parágrafo Terceiro –', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const paragraph3Text = ` A caixa com todos os equipamentos devidamente acondicionados será entregue para a transportadora pela Primeira Distratante, no prazo estabelecido, assim como a declaração de conteúdo devidamente assinada.`;
    const paragraph3Lines = doc.splitTextToSize(paragraph3Text, contentWidth - 30);
    doc.text(paragraph3Lines, margin + 30, yPosition);
    yPosition += paragraph3Lines.length * lineHeight + 10;

    // Clause 4 - Final settlement
    doc.setFont('helvetica', 'bold');
    doc.text('CLÁUSULA QUARTA –', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const clause4Text = ` Com o cumprimento do presente acordo as partes se declaram reciprocamente quitadas, nada mais tendo a reclamar uma da outra, seja a título de comissões, indenizações legais, lucros cessantes ou danos morais.`;
    const clause4Lines = doc.splitTextToSize(clause4Text, contentWidth - 30);
    doc.text(clause4Lines, margin + 30, yPosition);
    yPosition += clause4Lines.length * lineHeight + 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Parágrafo único –', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const clauseUniqueText = ` Declaram as partes que sempre mantiveram entre si relação comercial de prestação de serviços, inexistindo qualquer outra relação jurídica, especialmente empregatícia.`;
    const clauseUniqueLines = doc.splitTextToSize(clauseUniqueText, contentWidth - 30);
    doc.text(clauseUniqueLines, margin + 30, yPosition);
    yPosition += clauseUniqueLines.length * lineHeight + 10;

    // Clause 5 - Jurisdiction
    doc.setFont('helvetica', 'bold');
    doc.text('CLÁUSULA QUINTA –', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const clause5Text = ` Para dirimir qualquer questão oriunda do presente contrato, as partes elegem o Foro da Comarca de Jaguaruna/SC, renunciando a qualquer outro, por mais privilegiado que seja.`;
    const clause5Lines = doc.splitTextToSize(clause5Text, contentWidth - 30);
    doc.text(clause5Lines, margin + 30, yPosition);
    yPosition += clause5Lines.length * lineHeight + 20;

    // Final paragraph
    const finalText = `Assim, estando justos e contratados, obrigando-se por todo o conteúdo do presente, de forma irrenunciável e irretratável, assinam-no em duas (2) vias de igual teor e forma, após o terem lido e achado de acordo, juntamente com duas (2) testemunhas a tudo presente e que também assinam.`;
    const finalLines = doc.splitTextToSize(finalText, contentWidth);
    doc.text(finalLines, margin, yPosition);
    yPosition += finalLines.length * lineHeight + 20;

    // Location and date
    const currentDate = format(new Date(), 'dd/MM/yyyy');
    doc.text(`Coral Springs, USA, ${currentDate}.`, margin, yPosition);
    yPosition += 30;

    // Signature lines
    doc.text('_________________________________', margin, yPosition);
    doc.text('Primeira Distratante', margin, yPosition + 10);
    
    doc.text('_________________________________', margin + 100, yPosition);
    doc.text('Segunda Distratante', margin + 100, yPosition + 10);

    // Return PDF as buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    return pdfBuffer;
  }

  static getTerminationDocumentFilename(consultantName: string): string {
    const cleanName = consultantName.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = format(new Date(), 'yyyy-MM-dd');
    return `distrato_${cleanName}_${timestamp}.pdf`;
  }
}
