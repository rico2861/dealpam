export declare class MailService {
    private readonly logger;
    private transporter;
    constructor();
    private layout;
    private hero;
    private btn;
    private greeting;
    private para;
    private alert;
    private divider;
    private table;
    private linkNote;
    sendWelcome(to: string, firstName: string): Promise<void>;
    sendEmailVerification(to: string, firstName: string, verifyUrl: string): Promise<void>;
    sendSellerApproved(to: string, firstName: string, storeName: string): Promise<void>;
    sendSellerRejected(to: string, firstName: string, reason?: string): Promise<void>;
    sendPasswordReset(to: string, firstName: string, resetUrl: string): Promise<void>;
    sendAdminPasswordReset(to: string, firstName: string, tempPassword: string): Promise<void>;
    sendAccountLocked(to: string, firstName: string, resetUrl: string): Promise<void>;
    sendPasswordChanged(to: string, firstName: string): Promise<void>;
    sendNewOrderToSeller(to: string, sellerName: string, order: {
        number: string;
        customerName: string;
        customerPhone: string;
        customerEmail: string;
        customerAddress: string;
        items: {
            name: string;
            qty: number;
            price: number;
        }[];
        total: number;
        comment?: string;
    }): Promise<void>;
    sendOrderConfirmationToCustomer(to: string, customerName: string, order: {
        number: string;
        sellerName: string;
        sellerPhone?: string;
        sellerEmail?: string;
        items: {
            name: string;
            qty: number;
            price: number;
        }[];
        total: number;
    }): Promise<void>;
    sendOrderStatusUpdate(to: string, customerName: string, orderNumber: string, status: string, detail?: string): Promise<void>;
    sendNewMessageNotification(to: string, recipientName: string, senderName: string, preview: string, chatUrl: string): Promise<void>;
    sendSubscriptionExpiryReminder(to: string, firstName: string, planName: string, daysLeft: number, renewUrl: string): Promise<void>;
    sendSubscriptionExpired(to: string, firstName: string, planName: string, renewUrl: string): Promise<void>;
    sendSubscriptionRenewed(to: string, firstName: string, planName: string, endDate: Date): Promise<void>;
    sendRaw(to: string, subject: string, bodyHtml: string): Promise<void>;
    private send;
    private esc;
}
