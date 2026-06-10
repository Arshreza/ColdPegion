-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrgPlan" AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'PENDING');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "JoinStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "ProductIcpMode" AS ENUM ('PROMPT', 'FILTER');

-- CreateEnum
CREATE TYPE "EmailProvider" AS ENUM ('RESEND', 'GMAIL', 'SMTP');

-- CreateEnum
CREATE TYPE "EmailAccountStatus" AS ENUM ('CONNECTED', 'ERROR', 'WARMING_UP', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "ProductMode" AS ENUM ('SINGLE', 'GROUP', 'ALL');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SequenceMode" AS ENUM ('AI_GENERATED', 'STATIC', 'HYBRID', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "PreparedEmailStatus" AS ENUM ('PENDING', 'SENT');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'REPLIED', 'PAUSED', 'BOUNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('SENT', 'RECEIVED');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED', 'BOUNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReplyCategory" AS ENUM ('INTERESTED', 'NOT_INTERESTED', 'OUT_OF_OFFICE', 'AUTO_REPLY', 'QUESTION', 'UNSUBSCRIBE', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "EmailBounceStatus" AS ENUM ('UNKNOWN', 'VALID', 'INVALID', 'CATCH_ALL', 'DISPOSABLE', 'SPAMTRAP');

-- CreateEnum
CREATE TYPE "SidekickRole" AS ENUM ('USER', 'ASSISTANT', 'TOOL');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryDomain" TEXT,
    "plan" "OrgPlan" NOT NULL DEFAULT 'FREE',
    "planStatus" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "planRenewsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgInvite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JoinRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "JoinStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDomain" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP(3),
    "organizationId" TEXT,
    "role" "OrgRole" NOT NULL DEFAULT 'OWNER',
    "memberStatus" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apiBaseUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "modelName" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "description" TEXT,
    "valuePropositions" TEXT,
    "toneOfVoice" TEXT,
    "targetMarkets" TEXT,
    "rawScrapedData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" TEXT,
    "usps" TEXT,
    "targetAudience" TEXT,
    "category" TEXT,
    "tags" TEXT,
    "sourceUrl" TEXT,
    "imageUrl" TEXT,
    "productFiles" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "icpMode" "ProductIcpMode" NOT NULL DEFAULT 'PROMPT',
    "icpPrompt" TEXT,
    "icpFilters" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "assignedToUserId" TEXT,
    "sharedWithOrg" BOOLEAN NOT NULL DEFAULT true,
    "domain" TEXT,
    "emailAddress" TEXT NOT NULL,
    "displayName" TEXT,
    "provider" "EmailProvider" NOT NULL,
    "resendApiKey" TEXT,
    "gmailAppPassword" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUsername" TEXT,
    "smtpPassword" TEXT,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "imapHost" TEXT,
    "imapPort" INTEGER,
    "imapUsername" TEXT,
    "imapPassword" TEXT,
    "imapSecure" BOOLEAN NOT NULL DEFAULT true,
    "imapEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "dailyLimit" INTEGER NOT NULL DEFAULT 50,
    "sentToday" INTEGER NOT NULL DEFAULT 0,
    "lastResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "warmupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "warmupDailyMax" INTEGER NOT NULL DEFAULT 10,
    "warmupTag" TEXT,
    "warmupSentToday" INTEGER NOT NULL DEFAULT 0,
    "warmupLastReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "EmailAccountStatus" NOT NULL DEFAULT 'CONNECTED',
    "lastError" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "companyName" TEXT,
    "jobTitle" TEXT,
    "linkedinUrl" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "location" TEXT,
    "timezone" TEXT,
    "customFields" TEXT,
    "source" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isDnc" BOOLEAN NOT NULL DEFAULT false,
    "bounceStatus" "EmailBounceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "verificationScore" DOUBLE PRECISION,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectListEntry" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "prospectListId" TEXT NOT NULL,

    CONSTRAINT "ProspectListEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "productMode" "ProductMode" NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'DRAFT',
    "guidelines" TEXT,
    "systemPrompt" TEXT,
    "sequenceMode" "SequenceMode" NOT NULL DEFAULT 'AI_GENERATED',
    "staticSequence" TEXT,
    "sequenceSteps" TEXT,
    "dailyEmailLimit" INTEGER NOT NULL DEFAULT 100,
    "sentToday" INTEGER NOT NULL DEFAULT 0,
    "lastResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "minIntervalMinutes" INTEGER NOT NULL DEFAULT 1,
    "maxIntervalMinutes" INTEGER NOT NULL DEFAULT 5,
    "randomDelayMax" INTEGER NOT NULL DEFAULT 3,
    "scheduleTimezone" TEXT NOT NULL DEFAULT 'UTC',
    "scheduleStartHour" INTEGER NOT NULL DEFAULT 9,
    "scheduleEndHour" INTEGER NOT NULL DEFAULT 17,
    "scheduleDays" TEXT NOT NULL DEFAULT '1,2,3,4,5',
    "scheduleStartDate" TIMESTAMP(3),
    "launchedAt" TIMESTAMP(3),
    "trackOpens" BOOLEAN NOT NULL DEFAULT false,
    "trackClicks" BOOLEAN NOT NULL DEFAULT false,
    "includeUnsubscribe" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreparedEmail" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 0,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "PreparedEmailStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreparedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentProduct" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "AgentProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentEmailAccount" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "emailAccountId" TEXT NOT NULL,

    CONSTRAINT "AgentEmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentProspectList" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "prospectListId" TEXT NOT NULL,

    CONSTRAINT "AgentProspectList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sequence" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "steps" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SequenceEnrollment" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "nextSendAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SequenceEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Email" (
    "id" TEXT NOT NULL,
    "agentId" TEXT,
    "emailAccountId" TEXT NOT NULL,
    "prospectId" TEXT,
    "fromEmail" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "direction" "EmailDirection" NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "messageId" TEXT,
    "inReplyTo" TEXT,
    "threadId" TEXT,
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "replyCategory" "ReplyCategory",
    "isWarmup" BOOLEAN NOT NULL DEFAULT false,
    "variantId" TEXT,
    "sequenceStep" INTEGER,
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalLead" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "fullName" TEXT,
    "jobTitle" TEXT,
    "seniority" TEXT,
    "department" TEXT,
    "companyName" TEXT,
    "companyDomain" TEXT,
    "industry" TEXT,
    "headcount" TEXT,
    "employeeCount" INTEGER,
    "location" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "linkedinUrl" TEXT,
    "phone" TEXT,
    "keywords" TEXT,
    "technologies" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT 'read,write',
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthClient" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "redirectUris" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAuthCode" (
    "code" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "codeChallenge" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'read,write',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAuthCode_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "OAuthToken" (
    "id" TEXT NOT NULL,
    "accessTokenHash" TEXT NOT NULL,
    "refreshTokenHash" TEXT,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT 'read,write',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyEmailLimit" INTEGER NOT NULL DEFAULT 500,
    "zeroBounceApiKey" TEXT,
    "verifyOnImport" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SidekickConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SidekickConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SidekickMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "SidekickRole" NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" TEXT,
    "toolResults" TEXT,
    "pageContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SidekickMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_primaryDomain_key" ON "Organization"("primaryDomain");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgInvite_token_key" ON "OrgInvite"("token");

-- CreateIndex
CREATE INDEX "OrgInvite_email_idx" ON "OrgInvite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "JoinRequest_organizationId_userId_key" ON "JoinRequest"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailDomain_domain_key" ON "EmailDomain"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LlmConfig_userId_key" ON "LlmConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_userId_key" ON "CompanyProfile"("userId");

-- CreateIndex
CREATE INDEX "EmailAccount_organizationId_idx" ON "EmailAccount"("organizationId");

-- CreateIndex
CREATE INDEX "EmailAccount_domain_idx" ON "EmailAccount"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_userId_email_key" ON "Prospect"("userId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectListEntry_prospectId_prospectListId_key" ON "ProspectListEntry"("prospectId", "prospectListId");

-- CreateIndex
CREATE INDEX "PreparedEmail_agentId_idx" ON "PreparedEmail"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "PreparedEmail_agentId_prospectId_step_key" ON "PreparedEmail"("agentId", "prospectId", "step");

-- CreateIndex
CREATE UNIQUE INDEX "AgentProduct_agentId_productId_key" ON "AgentProduct"("agentId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentEmailAccount_agentId_emailAccountId_key" ON "AgentEmailAccount"("agentId", "emailAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentProspectList_agentId_prospectListId_key" ON "AgentProspectList"("agentId", "prospectListId");

-- CreateIndex
CREATE UNIQUE INDEX "SequenceEnrollment_sequenceId_prospectId_key" ON "SequenceEnrollment"("sequenceId", "prospectId");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalLead_linkedinUrl_key" ON "GlobalLead"("linkedinUrl");

-- CreateIndex
CREATE INDEX "GlobalLead_jobTitle_idx" ON "GlobalLead"("jobTitle");

-- CreateIndex
CREATE INDEX "GlobalLead_seniority_idx" ON "GlobalLead"("seniority");

-- CreateIndex
CREATE INDEX "GlobalLead_department_idx" ON "GlobalLead"("department");

-- CreateIndex
CREATE INDEX "GlobalLead_industry_idx" ON "GlobalLead"("industry");

-- CreateIndex
CREATE INDEX "GlobalLead_companyName_idx" ON "GlobalLead"("companyName");

-- CreateIndex
CREATE INDEX "GlobalLead_country_idx" ON "GlobalLead"("country");

-- CreateIndex
CREATE INDEX "GlobalLead_headcount_idx" ON "GlobalLead"("headcount");

-- CreateIndex
CREATE INDEX "GlobalLead_email_idx" ON "GlobalLead"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiToken_userId_idx" ON "ApiToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthToken_accessTokenHash_key" ON "OAuthToken"("accessTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthToken_refreshTokenHash_key" ON "OAuthToken"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "OAuthToken_userId_idx" ON "OAuthToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalSettings_userId_key" ON "GlobalSettings"("userId");

-- AddForeignKey
ALTER TABLE "OrgInvite" ADD CONSTRAINT "OrgInvite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDomain" ADD CONSTRAINT "EmailDomain_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmConfig" ADD CONSTRAINT "LlmConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectList" ADD CONSTRAINT "ProspectList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectListEntry" ADD CONSTRAINT "ProspectListEntry_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectListEntry" ADD CONSTRAINT "ProspectListEntry_prospectListId_fkey" FOREIGN KEY ("prospectListId") REFERENCES "ProspectList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreparedEmail" ADD CONSTRAINT "PreparedEmail_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreparedEmail" ADD CONSTRAINT "PreparedEmail_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentProduct" ADD CONSTRAINT "AgentProduct_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentProduct" ADD CONSTRAINT "AgentProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEmailAccount" ADD CONSTRAINT "AgentEmailAccount_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEmailAccount" ADD CONSTRAINT "AgentEmailAccount_emailAccountId_fkey" FOREIGN KEY ("emailAccountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentProspectList" ADD CONSTRAINT "AgentProspectList_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentProspectList" ADD CONSTRAINT "AgentProspectList_prospectListId_fkey" FOREIGN KEY ("prospectListId") REFERENCES "ProspectList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sequence" ADD CONSTRAINT "Sequence_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceEnrollment" ADD CONSTRAINT "SequenceEnrollment_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceEnrollment" ADD CONSTRAINT "SequenceEnrollment_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_emailAccountId_fkey" FOREIGN KEY ("emailAccountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthToken" ADD CONSTRAINT "OAuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalSettings" ADD CONSTRAINT "GlobalSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SidekickConversation" ADD CONSTRAINT "SidekickConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SidekickMessage" ADD CONSTRAINT "SidekickMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SidekickConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

