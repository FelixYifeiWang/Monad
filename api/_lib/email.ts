import { Resend } from 'resend';

// Simple function to get Resend client
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not found in environment variables');
  }
  
  return new Resend(apiKey);
}

export async function sendInquiryStatusEmail(
  businessEmail: string,
  influencerName: string,
  status: 'approved' | 'rejected' | 'needs_info',
  additionalInfo?: string
) {
  try {
    const client = getResendClient();
    
    // Use a default "from" email - you'll need to verify this domain in Resend
    // For now, we'll use the one from your env or a default
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com';

    let subject = '';
    let htmlContent = '';

    switch (status) {
      case 'approved':
        subject = `Great news! Your collaboration proposal has been approved`;
        htmlContent = `
          <h2>Your proposal has been approved!</h2>
          <p>Hi there,</p>
          <p><strong>${influencerName}</strong> has reviewed your collaboration proposal and approved it.</p>
          ${additionalInfo ? `<p><strong>Message:</strong><br>${additionalInfo}</p>` : ''}
          <p>They will be in touch with you soon to discuss next steps.</p>
          <br>
          <p>Best regards,<br>The Monad Team</p>
        `;
        break;

      case 'rejected':
        subject = `Update on your collaboration proposal`;
        htmlContent = `
          <h2>Update on your proposal</h2>
          <p>Hi there,</p>
          <p>Thank you for your interest in collaborating with <strong>${influencerName}</strong>.</p>
          <p>After careful consideration, they've decided not to move forward with this particular collaboration at this time.</p>
          ${additionalInfo ? `<p><strong>Feedback:</strong><br>${additionalInfo}</p>` : ''}
          <p>We appreciate you reaching out and wish you the best with your future campaigns.</p>
          <br>
          <p>Best regards,<br>The Monad Team</p>
        `;
        break;

      case 'needs_info':
        subject = `More information needed for your collaboration proposal`;
        htmlContent = `
          <h2>Additional information needed</h2>
          <p>Hi there,</p>
          <p><strong>${influencerName}</strong> has reviewed your collaboration proposal and needs some additional information before making a decision.</p>
          ${additionalInfo ? `<p><strong>What they need:</strong><br>${additionalInfo}</p>` : ''}
          <p>Please reply to this email with the requested information, and they'll review your proposal again.</p>
          <br>
          <p>Best regards,<br>The Monad Team</p>
        `;
        break;
    }

    console.log(`📧 Attempting to send email from: ${fromEmail} to: ${businessEmail}`);
    
    const result = await client.emails.send({
      from: fromEmail,
      to: businessEmail,
      subject: subject,
      html: htmlContent,
    });

    console.log(`✅ Email sent successfully to ${businessEmail} for status: ${status}`, result);
  } catch (error: any) {
    console.error('❌ Error sending email:', error);
    console.error('Error details:', error?.message || error);
    if (error?.response) {
      console.error('Response error:', error.response);
    }
    // Don't throw - we don't want email failures to break the status update
  }
}