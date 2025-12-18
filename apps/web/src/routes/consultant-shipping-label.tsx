import { useParams, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useConsultantProfile } from '@/hooks/use-consultant-profile';
import { useGetSetting } from '@/hooks/use-settings';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import type { ShippingAddress } from '@vsol-admin/shared';

export default function ConsultantShippingLabelPage() {
  const { id } = useParams<{ id: string }>();
  const consultantId = parseInt(id!);
  
  const { data: consultant, isLoading: isLoadingConsultant, error: consultantError } = useConsultantProfile(consultantId);
  const { data: shippingAddressData, isLoading: isLoadingAddress } = useGetSetting('shipping_from_address');

  // Parse the shipping address from settings
  const fromAddress: ShippingAddress | null = shippingAddressData?.value 
    ? (() => {
        try {
          return JSON.parse(shippingAddressData.value);
        } catch {
          return null;
        }
      })()
    : null;

  // Auto-print when data is loaded
  useEffect(() => {
    if (consultant && fromAddress && !isLoadingConsultant && !isLoadingAddress) {
      // Small delay to ensure the page is fully rendered
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [consultant, fromAddress, isLoadingConsultant, isLoadingAddress]);

  const isLoading = isLoadingConsultant || isLoadingAddress;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (consultantError || !consultant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 print:hidden">
        <div className="text-lg text-red-600">Consultant not found</div>
        <Link to={`/consultants/${consultantId}`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
        </Link>
      </div>
    );
  }

  if (!fromAddress) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 print:hidden">
        <div className="text-lg text-amber-600">Shipping address not configured</div>
        <p className="text-gray-600">Please configure the shipping address in Settings first.</p>
        <div className="flex gap-2">
          <Link to="/settings">
            <Button>
              Go to Settings
            </Button>
          </Link>
          <Link to={`/consultants/${consultantId}`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const hasToAddress = consultant.address || consultant.city;

  if (!hasToAddress) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 print:hidden">
        <div className="text-lg text-amber-600">Consultant address not available</div>
        <p className="text-gray-600">This consultant does not have an address configured.</p>
        <Link to={`/consultants/${consultantId}`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Print controls - hidden when printing */}
      <div className="fixed top-4 left-4 z-50 print:hidden flex gap-2">
        <Link to={`/consultants/${consultantId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Shipping Label - Full page print layout */}
      <div className="shipping-label-page">
        {/* From Address - Top Left */}
        <div className="from-address">
          <div className="address-label">REMETENTE / FROM:</div>
          <div className="address-name">{fromAddress.companyName}</div>
          <div className="address-line">{fromAddress.address}</div>
          {fromAddress.neighborhood && (
            <div className="address-line">{fromAddress.neighborhood}</div>
          )}
          <div className="address-line">
            {fromAddress.city} - {fromAddress.state}
          </div>
          <div className="address-line">CEP: {fromAddress.cep}</div>
          <div className="address-line">BRASIL</div>
        </div>

        {/* To Address - Center */}
        <div className="to-address">
          <div className="address-label">DESTINATÁRIO / TO:</div>
          <div className="address-name">{consultant.name}</div>
          {consultant.address && (
            <div className="address-line">{consultant.address}</div>
          )}
          {consultant.neighborhood && (
            <div className="address-line">{consultant.neighborhood}</div>
          )}
          <div className="address-line">
            {consultant.city && consultant.state 
              ? `${consultant.city} - ${consultant.state}`
              : consultant.city || consultant.state || ''}
          </div>
          {consultant.cep && (
            <div className="address-line">CEP: {consultant.cep}</div>
          )}
          <div className="address-line">BRASIL</div>
        </div>
      </div>

      <style>{`
        @media screen {
          .shipping-label-page {
            width: 210mm;
            min-height: 297mm;
            margin: 60px auto 20px;
            padding: 20mm;
            background: white;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            position: relative;
            font-family: 'Arial', sans-serif;
          }
        }

        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }

          body {
            margin: 0;
            padding: 0;
          }

          .shipping-label-page {
            width: 100%;
            height: 100vh;
            margin: 0;
            padding: 0;
            position: relative;
            font-family: 'Arial', sans-serif;
          }
        }

        .from-address {
          position: absolute;
          top: 20mm;
          left: 20mm;
          max-width: 80mm;
        }

        .to-address {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          min-width: 100mm;
        }

        .address-label {
          font-size: 10pt;
          color: #666;
          margin-bottom: 4px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .from-address .address-name {
          font-size: 12pt;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .from-address .address-line {
          font-size: 11pt;
          line-height: 1.4;
          color: #333;
        }

        .to-address .address-name {
          font-size: 20pt;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .to-address .address-line {
          font-size: 16pt;
          line-height: 1.5;
          color: #000;
        }
      `}</style>
    </>
  );
}








