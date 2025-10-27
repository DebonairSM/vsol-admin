import { Consultant } from '@vsol-admin/shared';

export interface ContractGenerationError {
  message: string;
  missingFields: string[];
}

export class ContractService {
  /**
   * Validates if consultant has all required fields for contract generation
   */
  static validateConsultantForContract(consultant: Consultant): ContractGenerationError | null {
    const missingFields: string[] = [];

    if (!consultant.name?.trim()) {
      missingFields.push('Name');
    }
    
    if (!consultant.companyLegalName?.trim()) {
      missingFields.push('Company Legal Name');
    }
    
    if (!consultant.cnpj?.trim()) {
      missingFields.push('CNPJ');
    }

    if (missingFields.length > 0) {
      return {
        message: `Cannot generate contract. Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      };
    }

    return null;
  }

  /**
   * Generates Master Services Agreement contract for consultant
   */
  static generateContract(consultant: Consultant): string {
    const validationError = this.validateConsultantForContract(consultant);
    if (validationError) {
      throw new Error(validationError.message);
    }

    // Get current date in MM/DD/YYYY format
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const contractTemplate = `MASTER SERVICES AGREEMENT 
THIS MASTER SERVICES AGREEMENT ("Agreement") is entered into as of ${currentDate}, (the 
"Effective Date") between Visual Solutions Software, LLC. ("VSol"), a Florida Company 
L16000173993, located at 3111 N University Dr. Ste 105 - Coral Springs, FL 33065, and ${consultant.companyLegalName} (${consultant.name}), CNPJ: 
${consultant.cnpj} ("THE_CONSULTANT") (each a "Party" or the "Parties"). 
RECITALS 
A. VSol is a software development company specializing in software consulting, and has made a 
substantial investment of time, effort and expense to establish and develop its business, its 
goodwill, its products, its customer and supplier relationships, and to preserve and protect its 
Confidential Information (as defined below).  
B. THE_CONSULTANT is a software service provider that desires to provide certain services and 
deliverables to VSol. 
C. VSol desires to engage THE_CONSULTANT to provide certain services and deliverables to VSol, 
as agreed to by the Parties.  
NOW, THEREFORE, the Parties agree as follows: 
1. SERVICES. During the Term (as defined below) THE_CONSULTANT shall provide the 
professional services ("Services") as agreed to by the Parties. The Parties will agree to (i) a 
reasonably detailed description of the Services to be performed and any Deliverables 
(defined below) to be provided; (ii) an estimated schedule and completion date; (iii) the 
identity of the employees who THE_CONSULTANT reasonably anticipates will perform the 
Services; (iv) an acceptance procedure for the Services rendered, if applicable; (v) a 
compensation and payment schedule; and (vi) any other items that either VSol or 
THE_CONSULTANT may require. The terms and conditions in this Agreement shall govern 
THE_CONSULTANT's provision of Services and Deliverables under the Agreement.   
a. Exportation of your services. THE_CONSULTANT shall provide services directly to VSol, a 
registered Florida company. Your services will be consumed by our clients located in the 
United States and throughout the world and must NOT be performed from within the 
United States. Your services must be performed by you and must NOT be performed by a 
US Person, as this term is defined by governing US law. 
b. Deliverables. "Deliverables" means the software, source code, object code, products, 
modifications, improvements, reports, videos, documents, templates, studies, strategies, 
specifications, summaries, charts, drawings, manuals, documentation, ideas, concepts, 
techniques, processes or works of authorship developed or created by THE_CONSULTANT 
for VSol in performing the Services under this Agreement, including any Intellectual 
Property Rights. "Intellectual Property Rights" means, on a world-wide basis, any (i) 
copyrights, moral rights, mask works, and all derivatives; (ii) trade secret or other 
confidential information rights; (iii) any patentable material or ideas, including patents, 
patent applications, and related applications; (iv) trademarks, trade name rights and 
similar rights and associated goodwill; and (v) intellectual and industrial property rights, 
of every kind and nature throughout the world and however designated. All Deliverables 
are deemed a "Work For Hire" within the meaning of the United States Copyright Act, 17 
U.S.C. § 101. To the extent that the Deliverables are not found to be "Works Made For 
Hire," THE_CONSULTANT irrevocably assigns, transfers and conveys, and will cause its 
personnel to assign, transfer and convey to VSol without further consideration, all of their 
rights, title, and interest in and to such Deliverables, including all Intellectual Property 
Rights. THE_CONSULTANT agrees that it will cooperate with VSol in executing documents 
or providing any other assistance to THE_CONSULTANT required for THE_CONSULTANT 
to protect its legal rights in the Deliverables. All Deliverables shall be the sole and 
exclusive property of THE_CONSULTANT and shall be provided without any liens, 
encumbrances or security interests, unless expressly agreed otherwise by the Parties in 
writing.   
2. FEES & REIMBURSEMENT & PAYMENT SYSTEMS.  
a. VSol shall: (i) pay THE_CONSULTANT the fees agreed to by the Parties forty-five (45) days 
from receipt of an undisputed invoice; and (ii) reimburse such expenses as 
THE_CONSULTANT reasonably incurs in provision of the Services, provided VSol has 
approved any such expenses in advance.  
b. THE_CONSULTANT will use client software from TimeDoctor.com to enter time worked, 
or paid time off (when entering time off is applicable). Please be advised that TimeDoctor 
has screen monitoring, URL monitoring and other monitoring capability that may 
POTENTIALLY be used on your user account without prior notice to you.  
c. Use of Payoneer or any other method of transferring money from VSol to 
THE_CONSULTANT. You agree that the values will be calculated in the agreed upon value 
and currency, but will be then converted to the currency used by the FinTech system, in 
the case of Payoneer US Dolar. This value may be lower or higher than number of hours 
paid, times the agreed upon hourly salary value in the currency agreed upon. You will not 
seek reimbursement or pay back credit to VSol for this difference of value between value 
of hours registered in TimeDoctor and value deposited in Payoneer account in USD. This 
fluctuation of values has already been accounted for in the value negotiated with 
THE_CONSULTANT priorly and no monies will be owed by either party.  
3. CONFIDENTIAL INFORMATION. For purposes of this Agreement, the term "Confidential 
Information" shall include all information about a Party's operations and business, employees, 
agents, contractors, subsidiaries or affiliates, whether written or oral, that is either non-public, 
confidential or proprietary in nature, whether or not such information is marked or described as 
"Confidential Information", including, but not limited to, a Party's trade secrets (including, but 
not limited to marketing and advertising strategies, client information, strategic analysis or 
planning information), suppliers, sales reports, financial information, costs, development or 
production information, business records and files, sales and advertising techniques and 
processes, product concepts, specifications and methods, financial statements, reports, records, 
proposals, letters, memoranda, contracts and information, salary and benefit information, 
marketing techniques, other trade secrets, copyrighted or copyrightable materials, patents, 
patentable material and other knowledge and information relating to current or planned 
customers or investors, current or projected sales volumes or business strategies. "Confidential 
Information" does not include information (i) which, at the time of disclosure, is in the public 
domain or is generally available to the public; (ii) after disclosure, the disclosing Party can 
establish became part of the public domain through no act or omission of the disclosing Party; 
(iii) the disclosing Party can establish was already in its possession, known to, developed by or in 
the possession of the disclosing Party under no obligation of confidentiality; (iv) the disclosing 
Party can establish was independently developed without any use of the Confidential 
Information, (v) the disclosing Party can establish was approved in writing by an authorized Party 
for disclosure. 
a. Nondisclosure. Both Parties agree not to (i) disclose or otherwise make available the 
Confidential Information to any third person, firm, corporation or entity; (ii) directly or 
indirectly copy or reverse engineer any Confidential Information; or (iii) use or allow third 
parties to use the Confidential Information except as agreed to by the Parties. The 
receiving Party will maintain the confidentiality of the Confidential Information by using 
the same degree of care that the receiving Party takes to hold in confidence its own 
proprietary information of a similar nature, which will be no less than reasonable care. 
Both Parties shall limit the use of, and access to, the Confidential Information to its bona 
fide employees, agents and consultants whose use of or access to the Confidential 
Information is necessary to provide the Services and who are informed by such Party of 
the confidential nature of the Confidential Information and who agree to be bound by the 
terms and conditions of this Agreement.  Both Parties shall be liable for all direct, 
consequential, and inconsequential damages and expenses, including any lost profits or 
sales commissions and reasonable attorneys' fees that result from a breach of this 
section. In the event either Party is requested or compelled by court order, decree, 
subpoena or other process or requirement of law to disclose the Confidential Information, 
the disclosing Party shall provide the other Party with reasonably prompt notice of any 
such disclosure requirement so that the other Party may, at its option and expense, seek 
a protective order or other appropriate remedy to prevent or limit the disclosure of the 
Confidential Information.   
b. Ownership of Confidential Information. Both Parties agree and acknowledge that each 
Party owns their own Confidential Information provided under this Agreement and agree 
that that no grant of rights is given or implied from the disclosure of any Confidential 
Information under this Agreement. Both Parties acknowledge and agree that neither it, 
nor its representatives, have made or make any representation or warranty, express or 
implied, as to the accuracy or completeness of any Confidential Information. 
c. Termination & Return. Any existing confidentiality or nondisclosure obligations under 
this Agreement shall survive such termination for a period of two (2) years from the 
Effective Date for all Confidential Information other than trade secrets, for which the 
obligations of this Agreement shall survive for as long as the trade secrets remain in effect. 
Upon termination of this Agreement, both Parties agree to return all copies of the other 
Party's Confidential Information or certify, in writing, the destruction thereof. 
4. REPRESENTATIONS & WARRANTIES.  
a. Both Parties represent and warrant that (i) it is a corporation or company duly 
incorporated or organized, validly existing and in good standing under the laws of the 
state or country in which it was incorporated or organized; (ii) it has all necessary 
corporate or company power and authority to enter into this Agreement; (iii) the 
execution, delivery and the consummation of the Agreement have each been authorized 
by all necessary corporate or company action and do not violate any judgment, order, or 
decree; (iv) the execution, delivery, and performance of this Agreement do not and will 
not constitute a material default under any contract by which it or any of its material 
assets are bound; (v) it is not a party to any agreement with a third party, the performance 
of which is reasonably likely to adversely affect the ability of VSol or THE_CONSULTANT 
to fully perform their respective obligations hereunder; and (vi) it is not a party to any 
pending litigation, the resolution of which is reasonably likely to adversely affect the 
ability of THE_CONSULTANT or VSol to fully perform their respective obligations 
hereunder, nor is any such litigation reasonably contemplated. 
b. THE_CONSULTANT represents and warrants that the Services will be rendered in a 
professional and workmanlike manner and will function, in all material respects, in 
conformance with the specifications agreed to by the Parties.  
c. THE_CONSULTANT represents and warrants that it has all necessary rights to perform the 
Services and create the Deliverables for VSol and to permit VSol to receive the Services 
and use the Deliverables. 
d. THE_CONSULTANT represents and warrants that the Deliverables are original to 
THE_CONSULTANT. 
e. THE_CONSULTANT represents and warrants that the Deliverables do not contain any third 
party materials or third party confidential information or trade secrets.  
f. 
THE_CONSULTANT represents and warrants that the Deliverables will (i) be free from 
defects in material and workmanship; (ii) will function as intended and in conformance 
with the specifications agreed to by the Parties as agreed to by the Parties. If VSol notifies 
THE_CONSULTANT of a breach of this warranty within thirty (30) days, THE_CONSULTANT 
will work diligently to correct and redeliver the affected Deliverable at no additional 
charge to VSol. In the event the affected Service or Deliverable is not corrected and 
accepted by VSol, THE_CONSULTANT will refund VSol all fees associated with that Service 
or Deliverable. 
5. INDEMNIFICATION. THE_CONSULTANT agrees to defend and indemnify VSol, its directors, 
officers, employees, representatives, and agents, against any claims, damages, expenses, losses, 
or liabilities, including reasonable attorneys' fees, (an "Indemnified Claim") arising out of, related 
to, or alleging: (a) infringement of any Intellectual Property Right by any Deliverable; or (b) injury 
to or death of any individual, or any loss of or damage to real or tangible personal property, 
caused by the act or omission of THE_CONSULTANT or of any of its agents, subcontractors, or 
employees. THE_CONSULTANT is not obligated to indemnify or defend VSol for an Indemnified 
Claim that arises out of: (i) VSol's breach of this Agreement; or (ii) VSol's revisions to the 
Deliverables made without THE_CONSULTANT's written consent. 
6. LIMITATION OF LIABILITY. EXCEPT FOR (I) THE INDEMNIFICATION OBLIGATIONS IN THIS 
AGREEMENT; (II) THE CONFIDENTIALITY OBLIGATIONS IN THIS AGREEMENT; OR (III) CLAIMS 
RESULTING FROM EITHER PARTY'S WILLFUL OR INTENTIONAL MISCONDUCT OR GROSS 
NEGLIGENCE, IN NO EVENT SHALL ONE PARTY BE LIABLE OR OBLIGATED IN ANY MANNER TO THE 
OTHER PARTY OR TO ANY THIRD PARTY FOR ANY CONSEQUENTIAL, INCIDENTAL, SPECIAL, 
INDIRECT, EXEMPLARY, OR PUNITIVE DAMAGES OF ANY KIND (INCLUDING, BUT NOT LIMITED TO, 
DAMAGES OR COSTS INCURRED AS A RESULT OF LOSS OF TIME, LOSS OF DATA, LOSS OF PROFITS 
OR REVENUE), REGARDLESS OF THE FORM OF ACTION, WHETHER IN CONTRACT, TORT, 
NEGLIGENCE, STRICT PRODUCT LIABILITY, OR OTHERWISE, EVEN IF THE PARTY HAS BEEN 
INFORMED OF THE POSSIBILITY OF ANY SUCH DAMAGES IN ADVANCE.   
7. Term & Termination. 
a. Term.  This Agreement shall commence as of the Effective Date and shall continue in 
effect until terminated in accordance with this Section.  
b. Termination For Convenience. Either Party may terminate this Agreement for 
convenience without any prior notice to the other Party. 
a. Termination For Cause. Either Party may terminate this Agreement for convenience 
without any prior notice to the other Party. 
c. Effect of Termination. Upon termination of this Agreement, THE_CONSULTANT will 
provide VSol with any work in progress prepared by THE_CONSULTANT for VSol under 
this Agreement. In addition, THE_CONSULTANT will provide VSol with transition 
assistance services on terms and prices to be mutually agreeable to the Parties to 
facilitate an orderly transition for VSol of the Services, whether internally or to another 
third party service provider. 
d. Survival. The following provisions will survive termination of this Agreement: Sections 3 
(Confidential Information), 4 (Representations and Warranties), 5 (Indemnification), 6 
(Limitation of Liability) and any other provision of this Agreement that must survive to 
fulfill its essential purpose. 
e. Contract automatic renewal. This contract renews itself automatically and without further 
notice, every year on the same date of the original signing by parties, unless parties have specified 
in any way that they are terminating this contract.  
8. Miscellaneous. 
a. Independent Contractors. The Parties are independent contractors and will so represent 
themselves in all regards. Neither Party is the agent of the other, and neither may make 
commitments on the other's behalf. The Parties agree that no THE_CONSULTANT 
employee or contractor is or will be considered an employee of VSol.  
b. Remedies. Both Parties acknowledge that the remedies at law for a breach of this 
Agreement are inadequate and that, in addition to any other remedy a Party may have, a 
Party shall be entitled to obtain an injunction restraining any breach or threatened 
breach, without any bond or other security being required.  Each Party shall be entitled 
to seek and obtain reimbursement for any damages resulting or arising from a breach of 
this Agreement, including and any litigation fees and expenses (including reasonable 
attorneys' fees).    
c. Publicity. Neither Party shall make or cause any public release of information regarding 
the arrangements or information referenced in this Agreement, except as is required by 
law or as may be agreed to by the Parties. 
d. Governing Law. This Agreement will be construed in accordance with the laws of the State 
of Florida, without regard to conflict of law rules, and both Parties submit to jurisdiction 
and venue in the appropriate state or federal court in Florida. 
e. Severability. The Parties agree that if any paragraph or provision of this Agreement is held 
by a competent court of law to be invalid or unenforceable, the remaining paragraphs 
and provisions will define this Agreement and remain in force. 
f. 
Entire Agreement. This Agreement contains the entire agreement between the Parties.  
No change, modification, alteration or addition to any provision of this Agreement will be 
binding unless in writing and signed by both parties. 
g. Waiver. The waiver or failure of either Party to exercise in any respect any right provided 
for in this Agreement shall not be deemed a waiver of any future right under this 
Agreement. 
h. Assignment. This Agreement will be binding upon, enforceable by, and inure to the 
benefit of each of the Parties and their respective successors and assigns. Either party 
may assign its rights and obligations under this Agreement without the consent of the 
other party (i) to an affiliate or a successor in interest; (ii) upon a sale of a majority of its 
outstanding capital stock to an affiliate or third-party; (iii) if it sells all or substantially all 
of its assets to a third party; or (iv) in the event of a merger or similar change of control 
event. 
i. 
j. 
Counterparts. This Agreement may be executed simultaneously in counterparts, each of 
which shall be deemed an original, but all of which together shall constitute one and the 
same instrument. 
Survival. Both Parties agree that their obligations under this Agreement shall survive the 
termination of this Agreement regardless of the manner or cause of such termination. 
k. Force Majeure. Neither Party will be liable to the other by reason of any failure or delay 
in performance of this Agreement due to acts of God, acts of governmental authority, 
unavailability of third party communication facilities or energy sources, fires, 
transportation delays, or any cause beyond the reasonable control of that Party (a "Force 
Majeure Event"). If the Force Majeure Event cannot be cured within thirty (30) days of 
the date of notice of the Force Majeure Event, the other Party 
All notices under this Agreement will be given by electronic means (email or fax), by overnight 
courier services, or by mail to a Party at its address set forth above, or such other address as it 
may substitute by notice to the other Party and will be effective upon receipt. 
Name: ${consultant.name} 
Title: Owner, ${consultant.companyLegalName} --------------------------------------------------------------
Name: ROmmel BANDEIRA 
Title: Owner, VSol Software --------------------------------------------------------------`;

    return contractTemplate;
  }

  /**
   * Generates filename for contract download
   */
  static generateContractFilename(consultant: Consultant): string {
    // Clean the name for use in filename - remove special characters and spaces
    const cleanName = consultant.name.replace(/[^a-zA-Z0-9]/g, '_');
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    return `MSA_${cleanName}_${date}.txt`;
  }
}
