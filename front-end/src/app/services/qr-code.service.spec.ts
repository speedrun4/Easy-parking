import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { QrCodeService, QrCodesResponse } from './qr-code.service';
import { environment } from '../../environments/environment';

describe('QrCodeService', () => {
  let service: QrCodeService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/api/pagamentos`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [QrCodeService]
    });
    service = TestBed.inject(QrCodeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should request QR codes by payment id', () => {
    const mock: QrCodesResponse = {
      entry: { token: 't1', imageBase64: 'img1', status: 'ativo' },
      exit: { token: 't2', imageBase64: 'img2', status: 'pendente' }
    };

    let result: QrCodesResponse | undefined;
    service.getByPaymentId(123).subscribe(r => (result = r));

    const req = httpMock.expectOne(`${baseUrl}/123/qrcodes`);
    expect(req.request.method).toBe('GET');
    req.flush(mock);

    expect(result).toEqual(mock);
  });

  it('should consume by token', () => {
    let ok: any;
    const token = 'abc';
    service.consumeByToken(token).subscribe(r => (ok = r));

    const req = httpMock.expectOne(`${baseUrl}/qrcodes/consume-by-token?token=${encodeURIComponent(token)}`);
    expect(req.request.method).toBe('POST');
    req.flush({ status: 'ENTRY_CONSUMED' });

    expect(ok).toEqual({ status: 'ENTRY_CONSUMED' });
  });
});
