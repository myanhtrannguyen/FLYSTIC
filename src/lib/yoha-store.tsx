import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  apiRequest,
  hasRemoteApi,
  type ApiCollectionRun,
  type ApiDemoCampaign,
  type ApiLeaderboardRow,
  type ApiSnapshot,
  type ApiStation,
  type ApiTransaction,
  type ApiUser,
} from "@/lib/yoha-api";

export type Role = "student" | "admin";
export type StudentOrganization = "hust" | "other";

export type Locale = "vi" | "en" | "ko";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  birthDate?: string;
  organization?: StudentOrganization;
  organizationDetail?: string;
  studentId?: string;
  faculty?: string;
  className?: string;
  collectionPoint?: string;
};

export type PlasticType = "PET" | "HDPE" | "PP" | "LDPE" | "PS";
export type Cleanliness = "CLEAN" | "NORMAL" | "DIRTY";

export type TxItem = {
  plasticType: PlasticType;
  quantity: number;
  cleanliness: Cleanliness;
  points: number;
};

export type TransactionStatus = "pending" | "confirmed" | "expired" | "cancelled";
export type PointDestination = "fundraising" | "rewards";

export type Transaction = {
  id: string;
  token: string;
  userId: string | null;
  userName: string | null;
  userFaculty?: string | null;
  adminId: string;
  collectionPoint: string;
  items: TxItem[];
  totalQuantity: number;
  weightKg: number; // estimated
  points: number;
  status: TransactionStatus;
  createdAt: number;
  confirmedAt?: number;
  expiresAt: number;
};

export type CollectionRun = {
  id: string;
  collectionPoint: string;
  weightKg: number;
  adminId: string;
  createdAt: number;
};

export type Station = {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  capacityKg: number;
  filledKg: number;
  fillPercent: number;
};

export type LeaderboardRow = {
  userId: string;
  name: string;
  faculty: string;
  points: number;
  kg: number;
};

type State = {
  user: User | null;
  /** Total points from all confirmed QR transactions. */
  points: number;
  /** Points retained for rewards and points allocated to volunteer fundraising. */
  rewardPoints: number;
  fundPoints: number;
  totalKg: number;
  transactions: Transaction[];
  collectionRuns: CollectionRun[];
  stations: Station[];
  leaderboard: LeaderboardRow[];
  demoCampaign: ApiDemoCampaign | null;
  locale: Locale;
};

const STORAGE_KEY = "yoha:state:v3";
const SESSION_KEY = "yoha:session:v1";
const LOCALE_KEY = "yoha:locale:v1";

const DEFAULT_LOCALE: Locale = "vi";

const KOREAN_TRANSLATIONS: Record<string, string> = {
  languageLabel: "언어",
  english: "English",
  vietnamese: "Tiếng Việt",
  korean: "한국어",
  backHome: "← 홈으로",
  authLogin: "로그인",
  authRegister: "회원가입",
  authWelcomeBack: "FLYSTIC에 다시 오신 것을 환영합니다.",
  authStartGreen: "친환경 여정을 시작하세요.",
  authStudentRole: "🎓 학생",
  authAdminRole: "🛠️ 수거함 관리자",
  authFullName: "성명",
  authStudentEmail: "학생 이메일",
  authAdminEmail: "관리자 이메일",
  authBirthDate: "생년월일",
  authOrganization: "소속 기관",
  authOrganizationPlaceholder: "소속 기관 선택",
  authOrganizationHust: "하노이 과학기술대학교",
  authOrganizationOther: "기타",
  authOrganizationDetail: "소속 기관 정보",
  authOrganizationDetailPlaceholder: "학교, 단체 또는 기관명을 입력하세요",
  authSchool: "학교 / 학부",
  authSchoolPlaceholder: "학교 / 학부 선택",
  authStudentId: "학번",
  authStudentIdPlaceholder: "학번 입력",
  authPassword: "비밀번호",
  authConfirmPassword: "비밀번호 확인",
  authPasswordMismatch: "비밀번호가 일치하지 않습니다.",
  authAdminInviteCode: "관리자 초대 코드",
  authSubmitting: "처리 중...",
  authServerError: "인증에 실패했습니다. 정보를 다시 확인해 주세요.",
  authNoAccount: "계정이 없으신가요? ",
  authHaveAccount: "이미 계정이 있으신가요? ",
  authSignUpNow: "회원가입",
  authSignInNow: "로그인",
  authDemoNote: "프로토타입: 데이터는 현재 이 기기에 저장됩니다.",
  routeHome: "홈",
  routeMap: "지도",
  routeScan: "QR 스캔",
  routeRewards: "선물 교환",
  routeProfile: "내 정보",
  routeDashboard: "대시보드",
  routeNewTransaction: "새 거래",
  routeTransactions: "거래 내역",
  routeReports: "보고서",
  studentGreeting: "좋은 아침이에요,",
  studentCurrentPoints: "현재 포인트",
  studentPoints: "포인트",
  studentNearest: "가까운 수거 지점",
  studentViewMap: "지도 보기 →",
  studentNoTransactions: "최근 활동이 없습니다. QR 코드를 스캔해 보세요!",
  studentCollected: "수거량",
  studentTransactions: "거래",
  studentScanQr: "QR 스캔",
  studentGuideSorting: "분류 안내",
  studentLeaderboard: "순위",
  studentNextLevel: "다음 레벨 {next}까지 {remaining}포인트 남았습니다",
  studentOpenStatus: "운영 중 · 수용량 {storage}%",
  studentNearFull: "거의 가득 참",
  studentAvailableSpace: "여유 있음",
  studentRecentActivity: "최근 활동",
  mapTitle: "수거 지도",
  mapDescription: "캠퍼스 내 가장 가까운 수거 지점을 찾아보세요.",
  mapFilterAll: "전체",
  mapFilterOpen: "운영 중",
  mapFilterNear: "거의 가득 참",
  mapLabel: "하노이 과학기술대학교 캠퍼스 지도",
  mapPins: "수거 지점 {count}곳 · HUST",
  mapAddress: "하노이 과학기술대학교 C7 건물",
  mapUniversity: "하노이 과학기술대학교",
  mapCapacity: "채워짐",
  mapStorageCurrent: "수거함 현재 적재량: {filled} / {capacity}kg",
  mapZoomIn: "지도 확대",
  mapZoomOut: "지도 축소",
  collectionPointSoictName: "정보통신기술대학",
  collectionPointSoictAddress: "하노이 과학기술대학교 B1동",
  collectionPointChemLifeName: "화학 및 생명과학대학",
  collectionPointChemLifeAddress: "하노이 과학기술대학교 C3동",
  collectionPointMechanicalName: "기계공학대학",
  collectionPointMechanicalAddress: "하노이 과학기술대학교 C7동",
  collectionPointInnovationName: "하노이 과학기술대학교 혁신센터",
  collectionPointInnovationAddress: "하노이 과학기술대학교 혁신센터",
  scanTitle: "QR 코드 스캔",
  scanDescription: "수거함 관리자가 표시한 코드를 스캔하세요.",
  scanUnsupported: "이 브라우저는 QR 스캔을 지원하지 않습니다",
  scanReady: "QR 코드 스캔 준비 완료",
  scanStarting: "카메라를 여는 중...",
  scanCameraPermissionTitle: "카메라 접근 허용",
  scanCameraPermissionDescription:
    "FLYSTIC은 QR 코드를 스캔할 때만 카메라를 사용합니다. 브라우저 알림에서 카메라를 허용해 주세요.",
  scanCameraPermissionButton: "카메라 허용 및 QR 스캔",
  scanCameraActive: "QR 코드가 프레임 안에 들어오도록 맞춰 주세요.",
  scanCameraDenied:
    "카메라 접근이 거부되었습니다. 브라우저 설정에서 yoha.io.vn의 카메라 권한을 켠 후 다시 시도해 주세요.",
  scanStop: "스캔 중지",
  scanManualLabel: "또는 코드를 직접 입력",
  scanTokenPlaceholder: "토큰을 여기에 붙여넣으세요",
  scanUploadLabel: "기기에서 QR 이미지 스캔",
  scanImageError: "이미지에서 QR 코드를 찾을 수 없습니다.",
  scanDemoPending: "대기 중인 거래",
  scanDemoHint: "이 기기에서 생성한 거래를 선택하세요:",
  scanInvalid: "유효하지 않은 QR 코드입니다",
  scanUsed: "이미 사용된 코드입니다",
  scanExpired: "만료된 코드입니다",
  scanCancelled: "취소된 거래입니다",
  scanDetectError: "카메라에서 QR 코드를 읽을 수 없습니다",
  scanCameraError: "카메라를 열 수 없습니다. 코드를 직접 입력할 수 있습니다.",
  scanSuccessTitle: "포인트가 적립되었습니다!",
  scanSuccessThanks: "FLYSTIC과 함께 환경을 보호해 주셔서 감사합니다.",
  scanSuccessYouEarned: "적립 포인트",
  scanSuccessPoints: "{count}kg의 플라스틱으로 받은 포인트",
  scanScanAgain: "다시 스캔",
  scanBackHome: "홈으로",
  scanConfirmTitle: "거래 확인",
  scanConfirmTotal: "총 적립 포인트",
  scanConfirmButton: "확인하고 포인트 받기",
  scanConfirmFail: "거래를 확인할 수 없습니다",
  scanStudentRequired:
    "현재 관리자 계정으로 로그인되어 있습니다. 포인트를 받으려면 다른 학생 계정으로 QR 코드를 스캔하세요.",
  scanSessionExpired: "로그인 세션이 만료되었습니다. 다시 로그인해 주세요.",
  scanAllocationTitle: "포인트 적립 방식을 선택하세요",
  scanAllocationDescription:
    "선물 교환 포인트를 적립하거나, 원한다면 VIT 모금에 함께할 수 있습니다.",
  scanFundraisingOption: "VIT 모금에 함께하기",
  scanFundraisingOptionDescription: "선택 사항: 자원봉사단 모금 포인트로 적립됩니다.",
  scanRewardsOption: "선물 교환 포인트 적립",
  scanRewardsOptionDescription: "현금 또는 나무 교환에 사용할 포인트로 누적됩니다.",
  scanSelectAllocation: "포인트 사용처를 선택하세요.",
  communityLabel: "플라스틱 교환 · 포인트 적립 · 선물 교환",
  communityTitle: "플라스틱을 친환경 선물로 바꿔 보세요",
  communityDescription:
    "FLYSTIC에서 플라스틱을 제출하고 포인트를 모아 현금 또는 나무로 교환하세요. VIT 모금 참여는 선택할 수 있는 부가 기능입니다.",
  communityHeroImageAlt: "FLYSTIC 플라스틱 교환 및 친환경 선물",
  communityPointsLabel: "나의 누적 포인트",
  communityPointsDescription:
    "플라스틱을 배출할 때마다 포인트가 기록되어 친환경 여정을 확인할 수 있습니다.",
  communityFundPointsLabel: "VIT 모금 포인트",
  communityRewardPointsLabel: "선물 교환 포인트",
  communityChooseTitle: "포인트를 어떻게 사용하시겠어요?",
  communityChooseDescription:
    "선물 교환이 FLYSTIC의 기본 혜택입니다. 원하면 VIT 모금에도 포인트를 적립할 수 있습니다.",
  communityFundraisingOption: "VIT 모금에 함께하기",
  communityFundraisingOptionDescription:
    "선택 사항: VIT가 공지하는 모금 활동과 캠페인을 확인하세요.",
  communityRewardsOption: "선물 교환",
  communityRewardsOptionDescription: "누적 포인트로 교환할 수 있는 항목을 확인하세요.",
  communityBackToChoices: "선택으로 돌아가기",
  communityFundraisingTeams: "함께하는 자원봉사단",
  communityVitTeam: "정보통신기술대학 학생 자원봉사단",
  communityVitTeamDescription:
    "나눔, 교류 그리고 지역사회 지원을 좋아하는 학생들의 활기찬 단체입니다.",
  communityMoreTeams: "다른 자원봉사단도 이곳에 추가될 예정입니다.",
  communityRewardsTitle: "포인트로 친환경 선물 교환",
  communityRewardsDescription:
    "각 교환은 FLYSTIC이 확인하며, 수령 안내는 앱과 팬페이지에 공지됩니다.",
  communityCashReward: "포인트를 현금으로 교환",
  communityCashRewardDetail: "1,000포인트 = 10,000 VND",
  communityTreeReward: "포인트를 나무로 교환",
  communityTreeRewardDetail: "500포인트 = 나무 1그루",
  communityRewardBalance: "현재 {points}포인트 보유",
  communityRewardCashAvailable: "이 항목으로 최대 {count}회 교환 가능",
  communityRewardTreesAvailable: "최대 나무 {count}그루 교환 가능",
  communityRewardContact: "이메일로 선물 교환 문의하기",
  communityAboutLabel: "VIT 소개",
  communityAboutTitle: "SoICT 학생 자원봉사단은 누구인가요?",
  communityAboutDescription:
    "VIT는 지역사회 활동을 사랑하는 학생들의 보금자리입니다. 학생들이 경험을 통해 성장하고 자원봉사 정신을 나눌 수 있도록 연결합니다.",
  communityMissionTitle: "사명과 목표",
  communityMissionServiceTitle: "지역사회 기여",
  communityMissionServiceDescription: "실질적인 캠페인으로 도움이 필요한 이웃을 지원합니다.",
  communityMissionConnectionTitle: "학생 연결",
  communityMissionConnectionDescription:
    "만나고 친구가 되며 함께 좋은 일을 할 수 있는 공간을 만듭니다.",
  communityMissionSkillsTitle: "역량 개발",
  communityMissionSkillsDescription: "팀워크, 소통, 행사 기획 능력을 기릅니다.",
  communityMissionTechnologyTitle: "사회를 위한 기술",
  communityMissionTechnologyDescription: "가능할 때마다 IT 지식으로 지역사회를 지원합니다.",
  communityFundsTitle: "투명하게 기록되는 여정",
  communityFundsDescription:
    "FLYSTIC은 플라스틱 배출량과 누적 포인트를 기록합니다. VIT 활동과 보고서는 팬페이지에 게시됩니다.",
  communityFlowCollect: "플라스틱 수거",
  communityFlowFund: "포인트 적립",
  communityFlowAction: "결과 확인",
  communityActivitiesLabel: "주요 활동",
  communityActivitiesTitle: "VIT가 만드는 의미 있는 여정",
  communityActivitiesDescription:
    "캠퍼스부터 지역사회까지, 모든 활동은 함께 나누고 성장할 기회입니다.",
  communityActivitySummerTitle: "그린 서머 2026",
  communityActivitySummerDescription: "지역사회를 지원하는 활동에 젊은 에너지를 보탭니다.",
  communityActivitySpringTitle: "사랑의 봄 2026",
  communityActivitySpringDescription: "나눔으로 학생들을 연결하고 따뜻함을 더 멀리 전합니다.",
  communityActivityFundraiserTitle: "사랑의 봄 모금 2026",
  communityActivityFundraiserDescription:
    "학생들의 마음을 실질적인 지원으로 바꾸기 위해 모금합니다.",
  communityMoreActivitiesTitle: "더 많은 의미 있는 활동이 기다립니다",
  communityMoreActivitiesDescription: "여러분의 에너지와 역량을 긍정적인 변화로 만들어 보세요.",
  communityActivityWelcome: "새 학기 길잡이",
  communityActivityMidAutumn: "어린이를 위한 추석",
  communityActivityWinter: "어린이를 위한 따뜻한 겨울",
  communityActivityBlood: "헌혈",
  communityFollowCta: "SoICT 자원봉사단 팔로우",
  communityFollowDescription: "팬페이지에서 VIT의 최신 활동과 참여 방법을 확인하세요.",
  profileImpact: "환경 영향",
  profileKg: "kg 플라스틱",
  profileBottles: "환산 페트병 수",
  profileItems: "항목",
  profileBadges: "나의 배지",
  profileSettings: "설정",
  profileHelp: "도움말 및 지원",
  profileTerms: "이용약관 및 개인정보",
  profileSignOut: "로그아웃",
  profileSettingsTitle: "설정",
  profileSettingsDescription: "이 기기에서 FLYSTIC 이용 환경을 설정하세요.",
  profileLanguageTitle: "표시 언어",
  profileLanguageDescription: "선택한 언어는 이 기기에 저장됩니다.",
  profileDataTitle: "계정 데이터",
  profileDataDescription: "계정 정보, 포인트, 수거 기록은 FLYSTIC 기능 운영을 위해 사용됩니다.",
  profileHelpTitle: "도움말 및 지원",
  profileHelpDescription: "재활용 플라스틱을 제출하고 포인트를 받는 방법입니다.",
  profileHelpStep1: "FLYSTIC 지도에서 수거 지점을 찾은 뒤 분류한 플라스틱을 가져오세요.",
  profileHelpStep2: "수거함 관리자가 플라스틱을 확인하고 거래 QR 코드를 만듭니다.",
  profileHelpStep3: "학생 계정으로 QR 코드를 스캔해 포인트를 받으세요.",
  profileHelpContactTitle: "추가 도움이 필요하신가요?",
  profileHelpContactDescription: "계정 또는 선물 교환 관련 문의는 FLYSTIC 이메일로 보내 주세요.",
  profileTermsTitle: "이용약관 및 개인정보",
  profileTermsDescription: "아래 내용은 현재 FLYSTIC 플랫폼 이용에 적용됩니다.",
  profileTermsUseTitle: "플랫폼 이용",
  profileTermsUseDescription:
    "정확한 정보를 제공하고 유효한 거래 QR만 스캔하며 거래 코드를 다른 사람과 공유하지 마세요.",
  profileTermsDataTitle: "기록되는 데이터",
  profileTermsDataDescription:
    "FLYSTIC은 혜택 확인과 수거 지점 운영을 위해 계정 정보, 포인트, 플라스틱 무게, 거래 기록을 기록합니다.",
  profileTermsPrivacyTitle: "보안 및 개인정보",
  profileTermsPrivacyDescription:
    "데이터는 FLYSTIC 운영에만 사용되며 개인 정보는 판매하지 않습니다. 데이터 관련 문의는 프로젝트 팀으로 연락하세요.",
  profileTermsContact: "이용약관 또는 개인 데이터 관련 문의: myanh260305@gmail.com",
  guideTitle: "플라스틱 분류 안내",
  guideDescription:
    "FLYSTIC은 재활용 가치가 있는 5가지 플라스틱만 수거합니다. 제품 바닥의 ♻️ 표시를 확인하세요.",
  guideHowItWorks: "이용 방법",
  guideStepsHeadline: "플라스틱 폐기물에서 누적 포인트까지, 네 단계",
  guideAccepted: "수거 가능",
  guideNotAccepted: "수거 불가",
  guideDetailsLabel: "상세:",
  guideCommonItemsLabel: "대표 품목:",
  guideQuality: "포인트 계산 방식",
  guideQualityHelp: "배출할 때 플라스틱의 상태를 평가합니다.",
  guideFormula: "수량 × 기본 포인트 × 품질 계수",
  guideExampleTitle: "예시",
  guideExampleCleanDry: "깨끗하고 마른 PET병 10개 → 10 × 10 × 1.5 = 150포인트",
  guideExampleDirty: "젖거나 더러운 PET병 10개 → 10 × 10 × 0.5 = 50포인트",
  guideRewardFormula: "합계: {total}포인트",
  guidePointUnit: "포인트/kg",
  guideCleanDry: "깨끗하고 건조함 (×1.5)",
  guideNormal: "보통 (×1.0)",
  guideDirtyWet: "더럽거나 젖음 (×0.5)",
  landingNavHow: "이용 방법",
  landingNavAdmin: "관리자",
  landingNavLeaderboard: "순위",
  landingNavCollaboration: "협력",
  landingLogin: "로그인",
  landingHeroLabel: "HUST × JBNU 학생 협력 프로젝트",
  landingTitleLine1: "FLYSTIC — 플라스틱을",
  landingTitleLine2: "캠퍼스의 친환경 실천으로 바꾸다",
  landingHeroDescription:
    "FLYSTIC은 베트남 하노이 과학기술대학교 학생과 한국 전북대학교 학생이 함께하는 협력 프로젝트입니다. 캠퍼스에서 플라스틱 분류, 수거, 포인트 기록을 지원합니다.",
  landingStartNow: "지금 시작",
  landingViewMap: "지도 보기",
  landingStatKg: "수거한 kg",
  landingStatStudents: "참여 학생",
  landingStatPoints: "수거 포인트",
  landingCurrentPointsLabel: "현재 포인트",
  landingCollectedLabel: "수거량",
  landingSchoolRankLabel: "학교 순위",
  landingScanQrCta: "수거 QR 스캔",
  landingPointsToNext: "다음 레벨까지 250포인트 남았습니다",
  landingGreeting: "좋은 아침이에요,",
  landingHowItWorksLabel: "이용 방법",
  landingPilotLabel: "시범 수거 지점",
  landingPilotTitle: "하노이 과학기술대학교의 4개 수거 허브",
  landingPilotDescription:
    "정보통신기술대학(B1동) · 화학 및 생명과학대학(C3동) · 기계공학대학(C7동) · 혁신센터.",
  landingCollaborationLabel: "베트남–한국 학생 협력",
  landingCollaborationTitle: "HUST × JBNU 학생들이 함께 만드는 FLYSTIC",
  landingCollaborationDescription:
    "두 대학 학생의 아이디어와 기술 역량을 연결해 캠퍼스의 친환경 생활을 장려합니다.",
  landingProjectFocusLabel: "프로젝트 초점",
  landingProjectFocus: "플라스틱 분류 · QR 스캔 · 포인트 기록 · 친환경 선물 교환",
  landingHowItWorksTitle: "FLYSTIC 이용 방법",
  landingStep1Title: "플라스틱을 수거함에 가져오세요",
  landingStep1Description: "캠퍼스 지도에서 가까운 수거 지점을 찾으세요.",
  landingStep2Title: "관리자가 무게를 재고 거래를 생성합니다",
  landingStep2Description: "플라스틱 종류, 무게, 청결도를 입력하면 시스템이 QR 코드를 생성합니다.",
  landingStep3Title: "QR 스캔 후 포인트 적립",
  landingStep3Description: "선물 교환 포인트를 적립하거나, 원하면 VIT 모금에 함께하세요.",
  landingStep4Title: "포인트로 선물 교환",
  landingStep4Description:
    "포인트를 모아 현금 또는 나무로 교환하세요. VIT 활동은 커뮤니티 메뉴에서 선택적으로 확인할 수 있습니다.",
  landingProjectLabel: "FLYSTIC 플랫폼",
  landingAdminLabel: "관리자용",
  landingAdminTitle: "FLYSTIC의 현재 기능",
  landingAdminDescription:
    "FLYSTIC은 플라스틱 분류 안내부터 QR 스캔과 학생 포인트 기록까지 명확한 수거 절차를 지원합니다.",
  landingStationDescription:
    "수거 지점에서 관리자가 플라스틱을 접수하고 거래를 만듭니다. 학생은 QR을 스캔해 거래와 포인트를 확인합니다.",
  landingCapabilityMapTitle: "수거 지점 지도",
  landingCapabilityMapDescription: "HUST 캠퍼스 안의 수거 지점을 확인하세요.",
  landingCapabilitySortingTitle: "분류 안내",
  landingCapabilitySortingDescription: "FLYSTIC이 수거하는 다섯 종류의 플라스틱을 확인하세요.",
  landingCapabilityQrTitle: "QR 확인",
  landingCapabilityQrDescription: "학생이 수거 지점에서 QR을 스캔하면 거래가 확인됩니다.",
  landingCapabilityRewardTitle: "포인트 기록",
  landingCapabilityRewardDescription: "누적 포인트로 참여를 확인하고 선물을 교환할 수 있습니다.",
  landingAdminTransactionTitle: "수거 전표",
  landingAdminStationTag: "기숙사 A 수거함",
  landingPlasticType: "플라스틱 종류",
  landingWeightKg: "무게 (kg)",
  landingCleanliness: "청결도",
  landingClean: "깨끗함",
  landingOk: "보통",
  landingDirty: "더러움",
  landingEstimatedPoints: "예상 포인트",
  landingConfirmCreateQr: "확인 및 QR 생성",
  landingAdminFeatureAutoPoints: "플라스틱 종류와 청결도에 따른 자동 포인트 계산",
  landingAdminFeatureSingleQr: "5분 후 만료되는 일회용 QR 코드",
  landingAdminFeatureReports: "일별, 주별, 월별, 학기별 보고서",
  landingAdminFeatureCapacity: "각 수거 지점의 수용량 추적",
  landingGamificationLabel: "친환경 여정",
  landingLeaderboardTitle: "월간 순위",
  landingLeaderboardDescription:
    "누적 포인트를 확인하고 적극적으로 플라스틱을 수거한 학생을 응원하세요.",
  landingBadgeGold: "🥇 골드 등급",
  landingBadgeGreenStarter: "🌱 친환경 새싹",
  landingBadgePlasticHero: "♻️ 플라스틱 히어로",
  landingBadgeStreak: "🔥 7일 연속",
  landingFooterProjectDescription:
    "베트남 하노이 과학기술대학교 학생과 한국 전북대학교 학생이 함께하는 협력 프로젝트입니다.",
  landingCollaborationSectionTitle: "학생을 연결하고, 함께 환경을 위한 행동을 만들다",
  landingCollaborationSectionDescription:
    "FLYSTIC은 두 대학 학생이 기술을 일상적인 친환경 습관에 연결하는 협력의 장입니다.",
  landingHustName: "하노이 과학기술대학교",
  landingHustCountry: "베트남",
  landingJbnuName: "전북대학교",
  landingJbnuCountry: "대한민국",
  landingCollaborationFootnote:
    "FLYSTIC은 두 대학 학생의 학술 교류와 협력 정신을 바탕으로 만들어졌습니다.",
  landingFooterCopyright: "© 2026 FLYSTIC 플랫폼",
  landingFacultyEconomics: "경제학부",
  landingFacultyIt: "IT 학부",
  landingFacultyEnvironment: "환경과학부",
  landingFacultyConstruction: "토목공학부",
  landingFacultyLanguages: "외국어학부",
  adminStation: "수거함 {station}",
  adminCreateTransaction: "거래 생성",
  adminCollectedWeek: "이번 주 수거량",
  adminTransactions: "거래",
  adminPointsOut: "지급 포인트",
  adminPending: "확인 대기",
  adminPlasticBreakdown: "플라스틱 종류별 수거량 (kg)",
  adminCapacity: "수거함 수용량",
  adminStationFill: "현재 수거량",
  adminStationFillDetail: "{filled} / {capacity}kg · 수용량 {percent}%",
  adminStationEmpty: "인계 기록",
  adminStationEmptyHint: "플라스틱을 수령 기관에 인계한 후에만 기록하세요.",
  adminStationEmptySuccess: "{weight}kg 인계가 기록되었습니다.",
  adminStationEmptyEmpty: "이 수거함에는 인계할 플라스틱이 없습니다.",
  adminRecent: "최근 거래",
  adminSeeAll: "전체 보기 →",
  adminTransactionPending: "대기 중",
  adminTransactionConfirmed: "확인됨",
  adminTransactionExpired: "만료됨",
  adminTransactionCancelled: "취소됨",
  adminTransactionTitle: "거래 내역",
  adminTransactionDescription: "이 수거함의 모든 수거 거래입니다.",
  adminStatusAll: "전체",
  adminSearchPlaceholder: "학생 / 수거함 검색…",
  adminNoFilterResults: "조건에 맞는 거래가 없습니다.",
  adminTableStudent: "학생",
  adminTableStation: "수거함",
  adminTableDetails: "플라스틱 상세",
  adminTableStatus: "상태",
  adminTablePoints: "포인트",
  adminFooterShowing: "전체 {total}건 중 {filtered}건 표시",
  adminUnits: "kg",
  adminTypes: "플라스틱 종류",
  adminDashboardTitle: "대시보드",
  adminNoData: "아직 데이터가 없습니다",
  adminTrendThisWeek: "이번 주",
  adminTrendActive: "운영 중",
  adminAwaitingStudent: "학생 확인 대기",
  adminSignOut: "로그아웃",
  adminMobileTitle: "FLYSTIC 관리자",
  adminConsoleTitle: "관리자 콘솔",
  adminQrHeader: "학생 스캔용 QR 코드",
  adminTokenExpiresIn: "토큰 만료까지",
  adminTokenExpired: "⏰ 토큰이 만료되었습니다",
  adminStudentConfirmed: "학생이 확인했습니다!",
  adminTransactionDetails: "거래 상세",
  adminTransactionToken: "토큰",
  adminTransactionStation: "수거함",
  adminTransactionTypeCount: "플라스틱 종류 수",
  adminTransactionWeightEstimate: "예상 무게",
  adminTransactionTotalPoints: "총 포인트",
  adminTransactionStatus: "거래 상태",
  adminCancelTransaction: "거래 취소",
  adminCreateAnotherTransaction: "새 거래 생성",
  adminNewTransactionTitle: "수거 거래 생성",
  adminNewTransactionDescription:
    "학생은 한 번에 여러 종류의 플라스틱을 제출할 수 있습니다. 아래에서 각 항목을 추가하세요.",
  adminCollectionPoint: "수거 지점",
  adminLineNumber: "종류 #{number}",
  adminDeleteLine: "삭제",
  adminQuantityUnits: "무게 (kg)",
  adminCondition: "상태",
  adminAddOtherType: "+ 다른 플라스틱 종류 추가",
  adminEstimatedPointsHeader: "예상 포인트",
  adminQrCreateButton: "확인 및 QR 생성",
  adminQrExpirationNote: "QR 코드는 5분 후 만료됩니다",
  adminPointsFormulaLabel: "계산식",
  adminPointsFormulaDetail: "포인트 = 수량 × 기본 포인트 × 품질 계수",
  copy: "복사",
  copied: "복사됨",
  adminReportsTitle: "보고서",
  adminReportsDescription: "최근 7일의 수거 현황입니다.",
  adminExportPdf: "PDF 내보내기",
  adminExportExcel: "Excel 내보내기",
  adminReportTotalWaste: "확인된 플라스틱 수거량",
  adminReportPetBottles: "PET병 {count}개",
  adminReportPointsIssued: "지급 포인트",
  adminReportTotal: "합계",
  adminReportTransactions: "거래",
  adminReportCo2Saved: "절감한 CO₂",
  adminReportEquivalent: "환산",
  adminReportTrees: "나무",
  adminWeeklyCollectionByDay: "일별 수거량 (kg)",
  adminTopStudents: "상위 참여자",
  adminGoalCollected: "수거 목표",
  adminGoalParticipants: "학생 참여 목표",
  adminGoalCo2: "CO₂ 절감 목표",
  adminMonthlyTargetProgress: "월간 목표 진행률",
  adminReportKgCollected: "{kg}kg 수거",
  adminReportParticipants: "참여 학생",
  adminReportEstimated: "설정된 환산 계수를 기준으로 한 추정치",
  adminReportCsvDownloaded: "CSV 보고서를 다운로드했습니다",
  adminReportViewLive: "최근 7일",
  adminReportViewDemo: "2026년 6–7월 데모",
  adminReportDemoLabel: "시연용 모의 데이터",
  adminReportDemoDescription: "가상의 계정과 거래로 구성된 FLYSTIC 제품 시연 데이터입니다.",
  adminRegisteredStudents: "등록 학생 계정",
  adminFundraisingAllocation: "모금 배정",
  adminDemoFundraisingDetail: "{points} / {total} 포인트가 모금에 배정됨",
  adminDemoBreakdown: "플라스틱 종류별 비율",
  adminDemoQuality: "수거 품질별 비율",
  adminQualityClean: "깨끗하고 건조함",
  adminQualityNormal: "보통",
  adminQualityDirty: "더럽거나 젖음",
  leaderboardDescription: "포인트 기준 학생 순위를 확인하세요",
  leaderboardWeek: "주간",
  leaderboardAll: "전체",
  leaderboardFaculty: "학부",
  leaderboardYourRank: "나의 순위",
  leaderboardTipsTitle: "순위 올리기 팁",
  leaderboardTipCleanDry: "깨끗하고 마른 플라스틱을 제출하면 더 많은 포인트를 받습니다.",
  leaderboardTipPrioritize: "대기 시간을 줄이려면 한산한 시간에 스캔하세요.",
  leaderboardTipInviteFriends: "친구를 초대해 함께 친환경 실천을 이어가세요.",
  leaderboardMembers: "명",
  leaderboardYouSuffix: " (나)",
};

const TRANSLATIONS = {
  vi: {
    languageLabel: "Ngôn ngữ",
    english: "English",
    vietnamese: "Tiếng Việt",
    korean: "한국어",
    backHome: "← Về trang chủ",
    authLogin: "Đăng nhập",
    authRegister: "Tạo tài khoản",
    authWelcomeBack: "Chào mừng bạn quay lại với FLYSTIC.",
    authStartGreen: "Bắt đầu hành trình sống xanh.",
    authStudentRole: "🎓 Sinh viên",
    authAdminRole: "🛠️ Admin trạm",
    authFullName: "Họ và tên",
    authStudentEmail: "Email sinh viên",
    authAdminEmail: "Email công vụ",
    authBirthDate: "Ngày / tháng / năm sinh",
    authOrganization: "Đơn vị",
    authOrganizationPlaceholder: "Chọn đơn vị",
    authOrganizationHust: "Đại học Bách khoa Hà Nội",
    authOrganizationOther: "Khác",
    authOrganizationDetail: "Thông tin đơn vị",
    authOrganizationDetailPlaceholder: "Nhập tên trường, tổ chức hoặc đơn vị",
    authSchool: "Trường / viện",
    authSchoolPlaceholder: "Chọn trường / viện",
    authStudentId: "MSSV",
    authStudentIdPlaceholder: "Nhập mã số sinh viên",
    authPassword: "Mật khẩu",
    authConfirmPassword: "Nhập lại mật khẩu",
    authPasswordMismatch: "Mật khẩu nhập lại chưa khớp.",
    authAdminInviteCode: "Mã mời quản trị viên",
    authSubmitting: "Đang xử lý...",
    authServerError: "Không thể xác thực. Vui lòng kiểm tra lại thông tin.",
    authEmailPlaceholderStudent: "minhson@student.edu.vn",
    authEmailPlaceholderAdmin: "admin@yoha.io.vn",
    authPasswordPlaceholder: "••••••••",
    authNoAccount: "Chưa có tài khoản? ",
    authHaveAccount: "Đã có tài khoản? ",
    authSignUpNow: "Đăng ký ngay",
    authSignInNow: "Đăng nhập",
    authDemoNote: "Bản thử nghiệm: dữ liệu hiện được lưu trên thiết bị này.",
    routeHome: "Trang chủ",
    routeMap: "Bản đồ",
    routeScan: "Quét QR",
    routeRewards: "Đổi quà",
    routeProfile: "Cá nhân",
    routeDashboard: "Dashboard",
    routeNewTransaction: "Tạo giao dịch",
    routeTransactions: "Giao dịch",
    routeReports: "Báo cáo",
    studentGreeting: "Chào buổi sáng,",
    studentCurrentPoints: "Tổng điểm hiện tại",
    studentPoints: "điểm",
    studentNearest: "Điểm thu gom gần bạn",
    studentViewMap: "Xem bản đồ →",
    studentNoTransactions: "Chưa có giao dịch nào. Hãy thử quét QR ngay nhé!",
    studentCollected: "Đã thu gom",
    studentTransactions: "Giao dịch",
    studentScanQr: "Quét QR",
    studentGuideSorting: "Phân loại",
    studentLeaderboard: "BXH",
    studentNextLevel: "Còn {remaining} điểm nữa để lên Level {next}",
    studentOpenStatus: "Đang mở · {storage}% sức chứa",
    studentNearFull: "Gần đầy",
    studentAvailableSpace: "Còn trống",
    mapTitle: "Bản đồ thu gom",
    mapDescription: "Tìm điểm gần bạn nhất trong khuôn viên trường.",
    mapFilterAll: "Tất cả",
    mapFilterOpen: "Đang mở",
    mapFilterNear: "Gần đầy",
    mapLabel: "Bản đồ Đại học Bách khoa Hà Nội",
    mapPins: "{count} điểm thu gom · BKHN",
    mapAddress: "Tòa nhà C7, Đại học Bách khoa Hà Nội",
    mapUniversity: "Đại học Bách khoa Hà Nội",
    mapCapacity: "đầy trạm",
    mapStorageCurrent: "{filled} / {capacity} kg đang có tại trạm",
    mapZoomIn: "Phóng to bản đồ",
    mapZoomOut: "Thu nhỏ bản đồ",
    collectionPointSoictName: "Trường Công nghệ Thông tin và Truyền thông",
    collectionPointSoictAddress: "Tòa B1, Đại học Bách khoa Hà Nội",
    collectionPointChemLifeName: "Trường Hóa và Khoa học Sự sống",
    collectionPointChemLifeAddress: "Tòa C3, Đại học Bách khoa Hà Nội",
    collectionPointMechanicalName: "Trường Cơ khí",
    collectionPointMechanicalAddress: "Tòa C7, Đại học Bách khoa Hà Nội",
    collectionPointInnovationName: "Trung tâm Đổi mới Sáng tạo, Đại học Bách khoa Hà Nội",
    collectionPointInnovationAddress: "Trung tâm Đổi mới Sáng tạo, Đại học Bách khoa Hà Nội",
    scanTitle: "Quét mã QR",
    scanDescription: "Quét mã do admin trạm thu gom hiển thị.",
    scanUnsupported: "Trình duyệt chưa hỗ trợ quét QR",
    scanReady: "Sẵn sàng quét mã QR",
    scanStarting: "Đang mở camera...",
    scanCameraPermissionTitle: "Cho phép dùng camera",
    scanCameraPermissionDescription:
      "FLYSTIC chỉ dùng camera khi bạn quét QR. Hãy cho phép camera trong thông báo của trình duyệt.",
    scanCameraPermissionButton: "Cho phép camera & quét QR",
    scanCameraActive: "Đưa mã QR vào trong khung để quét.",
    scanCameraDenied:
      "Bạn đã từ chối camera. Hãy bật quyền Camera cho yoha.io.vn trong cài đặt trình duyệt rồi thử lại.",
    scanStop: "Dừng quét",
    scanManualLabel: "Hoặc nhập mã thủ công",
    scanTokenPlaceholder: "Dán mã token tại đây",
    scanUploadLabel: "Quét QR từ ảnh trong máy",
    scanImageError: "Không tìm thấy mã QR trong ảnh này.",
    scanDemoPending: "Giao dịch đang chờ",
    scanDemoHint: "Chọn giao dịch được tạo tại trạm trên thiết bị này:",
    scanInvalid: "Mã QR không hợp lệ",
    scanUsed: "Mã đã được sử dụng",
    scanExpired: "Mã đã hết hạn",
    scanCancelled: "Giao dịch đã bị hủy",
    scanDetectError: "Không thể đọc mã QR từ camera",
    scanCameraError: "Không thể mở camera. Bạn vẫn có thể nhập mã thủ công.",
    scanSuccessTitle: "Tích điểm thành công!",
    scanSuccessThanks: "Cảm ơn bạn đã cùng FLYSTIC bảo vệ môi trường.",
    scanSuccessYouEarned: "Bạn vừa nhận",
    scanSuccessPoints: "điểm từ {count} kg nhựa",
    scanScanAgain: "Quét tiếp",
    scanBackHome: "Về trang chủ",
    scanConfirmTitle: "Xác nhận giao dịch",
    scanConfirmTotal: "Tổng điểm nhận",
    scanConfirmButton: "Xác nhận nhận điểm",
    scanConfirmFail: "Không thể xác nhận giao dịch",
    scanStudentRequired:
      "Bạn đang đăng nhập tài khoản admin. Hãy quét QR bằng một tài khoản sinh viên khác để nhận điểm.",
    scanSessionExpired: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    scanAllocationTitle: "Chọn nơi tích luỹ điểm",
    scanAllocationDescription:
      "Bạn có thể tích điểm đổi quà, hoặc nếu muốn thì đồng hành gây quỹ cùng VIT.",
    scanFundraisingOption: "Đồng hành gây quỹ cùng VIT",
    scanFundraisingOptionDescription:
      "Lựa chọn phụ: điểm được cộng vào quỹ đồng hành cùng Đội Tình nguyện VIT.",
    scanRewardsOption: "Tích điểm đổi quà",
    scanRewardsOptionDescription: "Điểm được cộng vào số dư để đổi tiền mặt hoặc cây xanh.",
    scanSelectAllocation: "Hãy chọn nơi tích luỹ điểm trước khi xác nhận.",
    studentRecentActivity: "Hoạt động gần đây",
    communityLabel: "Đổi nhựa · Tích điểm · Đổi quà",
    communityTitle: "Đổi nhựa lấy những món quà xanh",
    communityDescription:
      "Nộp nhựa tại FLYSTIC, tích điểm và đổi tiền mặt hoặc cây xanh. Đồng hành gây quỹ với VIT là một lựa chọn thêm nếu bạn muốn lan tỏa tác động.",
    communityHeroImageAlt: "FLYSTIC đổi nhựa lấy quà xanh",
    communityPointsLabel: "Điểm tích luỹ của bạn",
    communityPointsDescription:
      "Điểm được ghi nhận sau mỗi lần đổi nhựa để bạn theo dõi hành trình sống xanh của mình.",
    communityFundPointsLabel: "Điểm gây quỹ cùng VIT",
    communityRewardPointsLabel: "Điểm đổi quà",
    communityChooseTitle: "Bạn muốn dùng điểm như thế nào?",
    communityChooseDescription:
      "Đổi quà là quyền lợi chính tại FLYSTIC. Nếu muốn, bạn vẫn có thể tích điểm để đồng hành gây quỹ với VIT.",
    communityFundraisingOption: "Đồng hành gây quỹ cùng VIT",
    communityFundraisingOptionDescription:
      "Lựa chọn thêm để theo dõi các đội, hoạt động gây quỹ và chiến dịch do VIT công bố.",
    communityRewardsOption: "Đổi quà",
    communityRewardsOptionDescription: "Xem các lựa chọn quy đổi từ điểm tích luỹ của bạn.",
    communityBackToChoices: "Quay lại lựa chọn",
    communityFundraisingTeams: "Các đội đồng hành",
    communityVitTeam: "Đội Sinh viên Tình nguyện Trường Công nghệ Thông tin và Truyền thông",
    communityVitTeamDescription:
      "Tổ chức sinh viên năng động dành cho những bạn trẻ yêu thích cống hiến, kết nối và giúp đỡ cộng đồng.",
    communityMoreTeams: "Các đội tình nguyện khác sẽ được cập nhật tại đây.",
    communityRewardsTitle: "Đổi điểm lấy quà xanh",
    communityRewardsDescription:
      "Mỗi lựa chọn đổi quà được FLYSTIC xác nhận; hướng dẫn nhận quà sẽ được công bố trên ứng dụng và fanpage.",
    communityCashReward: "Đổi điểm lấy tiền mặt",
    communityCashRewardDetail: "1.000 điểm đổi 10.000 VNĐ",
    communityTreeReward: "Đổi điểm lấy cây xanh",
    communityTreeRewardDetail: "500 điểm đổi 1 cây xanh",
    communityRewardBalance: "Bạn đang có {points} điểm",
    communityRewardCashAvailable: "Tối đa {count} lượt đổi theo lựa chọn này",
    communityRewardTreesAvailable: "Tối đa {count} cây xanh theo lựa chọn này",
    communityRewardContact: "Liên hệ qua email để đổi quà",
    communityAboutLabel: "Về VIT",
    communityAboutTitle: "Đội Sinh viên Tình nguyện SoICT là ai?",
    communityAboutDescription:
      "VIT là mái nhà dành cho những sinh viên yêu hoạt động cộng đồng. Đội kết nối các bạn trẻ để sẻ chia, trưởng thành qua trải nghiệm và lan tỏa tinh thần tình nguyện.",
    communityMissionTitle: "Sứ mệnh và mục tiêu",
    communityMissionServiceTitle: "Cống hiến xã hội",
    communityMissionServiceDescription:
      "Hỗ trợ các hoàn cảnh khó khăn qua những chiến dịch thiết thực.",
    communityMissionConnectionTitle: "Gắn kết sinh viên",
    communityMissionConnectionDescription:
      "Mở ra không gian giao lưu, kết bạn và cùng làm điều có ích.",
    communityMissionSkillsTitle: "Phát triển kỹ năng",
    communityMissionSkillsDescription: "Rèn luyện làm việc nhóm, giao tiếp và tổ chức sự kiện.",
    communityMissionTechnologyTitle: "Công nghệ vì cộng đồng",
    communityMissionTechnologyDescription:
      "Ứng dụng kiến thức CNTT để hỗ trợ cộng đồng khi có cơ hội.",
    communityFundsTitle: "Hành trình được ghi nhận rõ ràng",
    communityFundsDescription:
      "FLYSTIC ghi nhận số nhựa đã nộp và điểm tích luỹ của bạn. Hoạt động cùng báo cáo của VIT được công bố trên fanpage.",
    communityFlowCollect: "Thu gom nhựa",
    communityFlowFund: "Tích luỹ điểm",
    communityFlowAction: "Theo dõi kết quả",
    communityActivitiesLabel: "Hoạt động nổi bật",
    communityActivitiesTitle: "Những hành trình VIT đang lan tỏa",
    communityActivitiesDescription:
      "Từ khuôn viên trường tới các địa phương, mỗi hoạt động là một cơ hội để cùng sẻ chia và trưởng thành.",
    communityActivitySummerTitle: "Mùa hè xanh 2026",
    communityActivitySummerDescription:
      "Sẵn sàng lên đường, góp sức trẻ cho các phần việc hỗ trợ cộng đồng tại địa phương.",
    communityActivitySpringTitle: "Xuân yêu thương 2026",
    communityActivitySpringDescription:
      "Gắn kết sinh viên trong không khí sẻ chia, mang những điều ấm áp đến gần hơn.",
    communityActivityFundraiserTitle: "Gây quỹ Xuân yêu thương 2026",
    communityActivityFundraiserDescription:
      "Cùng gây quỹ để biến sự chung tay của sinh viên thành những hành động thiết thực.",
    communityMoreActivitiesTitle: "Còn nhiều hoạt động đang chờ bạn",
    communityMoreActivitiesDescription:
      "Hãy tham gia để biến năng lượng và kỹ năng của bạn thành tác động tích cực.",
    communityActivityWelcome: "Tiếp sức đến trường",
    communityActivityMidAutumn: "Trung thu cho em",
    communityActivityWinter: "Đông ấm cho em",
    communityActivityBlood: "Hiến máu nhân đạo",
    communityFollowCta: "Theo dõi Đội Tình nguyện SoICT",
    communityFollowDescription:
      "Cập nhật hoạt động mới nhất và cơ hội đồng hành cùng VIT trên fanpage.",
    profileImpact: "Tác động môi trường",
    profileKg: "kg nhựa",
    profileBottles: "chai quy đổi",
    profileItems: "sản phẩm",
    profileBadges: "Huy hiệu của bạn",
    profileSettings: "Cài đặt",
    profileHelp: "Trợ giúp & Hỗ trợ",
    profileTerms: "Điều khoản & bảo mật",
    profileSignOut: "Đăng xuất",
    profileSettingsTitle: "Cài đặt",
    profileSettingsDescription: "Tùy chỉnh trải nghiệm FLYSTIC trên thiết bị của bạn.",
    profileLanguageTitle: "Ngôn ngữ hiển thị",
    profileLanguageDescription: "Lựa chọn này được lưu trên thiết bị hiện tại.",
    profileDataTitle: "Dữ liệu tài khoản",
    profileDataDescription:
      "Thông tin tài khoản, điểm tích luỹ và lịch sử giao dịch được dùng để vận hành các tính năng FLYSTIC.",
    profileHelpTitle: "Trợ giúp & Hỗ trợ",
    profileHelpDescription: "Thực hiện theo ba bước dưới đây để ghi nhận điểm từ nhựa tái chế.",
    profileHelpStep1: "Mang nhựa đã phân loại đến điểm thu gom trên bản đồ FLYSTIC.",
    profileHelpStep2: "Nhân viên trạm cân nhựa và tạo mã QR cho giao dịch.",
    profileHelpStep3: "Quét mã QR bằng tài khoản sinh viên để nhận điểm.",
    profileHelpContactTitle: "Cần hỗ trợ thêm?",
    profileHelpContactDescription:
      "Liên hệ FLYSTIC qua email để được hỗ trợ về tài khoản hoặc đổi quà.",
    profileTermsTitle: "Điều khoản & bảo mật",
    profileTermsDescription:
      "Các nội dung dưới đây áp dụng cho việc sử dụng bản hiện tại của nền tảng FLYSTIC.",
    profileTermsUseTitle: "Sử dụng nền tảng",
    profileTermsUseDescription:
      "Bạn cần cung cấp thông tin chính xác, chỉ quét mã QR của giao dịch hợp lệ và không chia sẻ mã giao dịch cho người khác.",
    profileTermsDataTitle: "Dữ liệu được ghi nhận",
    profileTermsDataDescription:
      "FLYSTIC ghi nhận thông tin tài khoản, điểm, khối lượng nhựa và lịch sử giao dịch để xác minh quyền lợi và vận hành điểm thu gom.",
    profileTermsPrivacyTitle: "Bảo mật và quyền riêng tư",
    profileTermsPrivacyDescription:
      "Dữ liệu chỉ phục vụ hoạt động của FLYSTIC; nền tảng không bán thông tin cá nhân. Hãy liên hệ nhóm dự án nếu cần hỗ trợ về dữ liệu của bạn.",
    profileTermsContact:
      "Liên hệ myanh260305@gmail.com nếu bạn có câu hỏi về điều khoản hoặc dữ liệu cá nhân.",
    guideTitle: "Hướng dẫn phân loại nhựa",
    guideDescription:
      "FLYSTIC chỉ thu gom 5 loại nhựa có giá trị tái chế. Kiểm tra ký hiệu ♻️ dưới đáy sản phẩm.",
    guideHowItWorks: "Cách thức hoạt động",
    guideStepsHeadline: "Bốn bước, từ chai nhựa thành điểm tích luỹ",
    landingNavHow: "Cách dùng",
    landingNavAdmin: "Admin",
    landingNavLeaderboard: "Xếp hạng",
    landingNavCollaboration: "Hợp tác",
    landingLogin: "Đăng nhập",
    landingHeroLabel: "Dự án hợp tác sinh viên HUST × JBNU",
    landingTitleLine1: "FLYSTIC — Cùng biến nhựa thành",
    landingTitleLine2: "hành động xanh tại trường học",
    landingHeroDescription:
      "FLYSTIC là dự án hợp tác giữa sinh viên Đại học Bách khoa Hà Nội, Việt Nam và sinh viên Đại học Jeonbuk National, Hàn Quốc. Nền tảng hỗ trợ phân loại, thu gom nhựa và ghi nhận điểm tại khuôn viên trường.",
    landingStartNow: "Bắt đầu ngay",
    landingViewMap: "Xem bản đồ",
    landingStatKg: "kg nhựa đã thu",
    landingStatStudents: "Sinh viên tham gia",
    landingStatPoints: "Điểm thu gom",
    landingCurrentPointsLabel: "Tổng điểm hiện tại",
    landingCollectedLabel: "Đã thu gom",
    landingSchoolRankLabel: "Hạng trường",
    landingScanQrCta: "Quét mã QR thu gom",
    landingGreeting: "Chào buổi sáng,",
    landingPointsToNext: "Còn 250 điểm nữa để lên cấp",
    landingPilotLabel: "Điểm thu gom thử nghiệm",
    landingPilotTitle: "04 hub thu gom tại Đại học Bách khoa Hà Nội",
    landingPilotDescription:
      "Trường Công nghệ Thông tin và Truyền thông (tòa B1) · Trường Hóa và Khoa học Sự sống (tòa C3) · Trường Cơ khí (tòa C7) · Trung tâm Đổi mới Sáng tạo.",
    landingCollaborationLabel: "Hợp tác Việt Nam – Hàn Quốc",
    landingCollaborationTitle: "Sinh viên HUST × JBNU cùng phát triển FLYSTIC",
    landingCollaborationDescription:
      "Dự án kết nối ý tưởng và năng lực công nghệ của sinh viên hai trường để khuyến khích lối sống xanh trong khuôn viên đại học.",
    landingProjectFocusLabel: "Trọng tâm dự án",
    landingProjectFocus: "Phân loại nhựa · quét QR · ghi nhận điểm · đổi quà xanh",
    landingHowItWorksLabel: "Cách thức hoạt động",
    landingHowItWorksTitle: "Hướng dẫn sử dụng FLYSTIC",
    landingStep1Title: "Mang nhựa đến trạm",
    landingStep1Description: "Tìm điểm thu gom gần nhất trên bản đồ khuôn viên trường.",
    landingStep2Title: "Admin cân & tạo giao dịch",
    landingStep2Description: "Nhập loại nhựa, khối lượng và mức độ sạch. Hệ thống sinh QR.",
    landingStep3Title: "Quét QR — Tích điểm",
    landingStep3Description:
      "Tích điểm để đổi quà, hoặc nếu muốn thì chọn đồng hành gây quỹ cùng VIT.",
    landingStep4Title: "Đổi quà khi đủ điểm",
    landingStep4Description:
      "Tích luỹ điểm để đổi tiền mặt hoặc cây xanh; hoạt động VIT vẫn được cập nhật tại mục cộng đồng.",
    landingProjectLabel: "Nền tảng FLYSTIC",
    landingAdminLabel: "Dành cho Admin",
    landingAdminTitle: "Các tính năng đang có của FLYSTIC",
    landingAdminDescription:
      "FLYSTIC tập trung vào quy trình thu gom rõ ràng, từ hướng dẫn phân loại nhựa tới quét QR và ghi nhận điểm cho sinh viên.",
    landingStationDescription:
      "Tại điểm thu gom, nhân viên trạm tạo giao dịch sau khi tiếp nhận nhựa. Sinh viên quét mã QR để xác nhận và nhận điểm.",
    landingCapabilityMapTitle: "Bản đồ điểm thu gom",
    landingCapabilityMapDescription: "Xác định vị trí điểm thu gom trong khuôn viên HUST.",
    landingCapabilitySortingTitle: "Hướng dẫn phân loại",
    landingCapabilitySortingDescription: "Tra cứu năm loại nhựa FLYSTIC đang tiếp nhận.",
    landingCapabilityQrTitle: "Xác nhận bằng QR",
    landingCapabilityQrDescription:
      "Giao dịch được xác nhận sau khi sinh viên quét mã QR tại trạm.",
    landingCapabilityRewardTitle: "Ghi nhận điểm",
    landingCapabilityRewardDescription: "Điểm tích luỹ được dùng để theo dõi đóng góp và đổi quà.",
    landingAdminTransactionTitle: "Phiếu thu gom",
    landingAdminStationTag: "KTX Khu A",
    landingPlasticType: "Loại nhựa",
    landingPlasticExamplePet: "PET",
    landingPlasticExampleHdpe: "HDPE",
    landingPlasticExamplePp: "PP",
    landingWeightKg: "Trọng lượng (kg)",
    landingCleanliness: "Độ sạch",
    landingClean: "Sạch",
    landingOk: "OK",
    landingDirty: "Bẩn",
    landingEstimatedPoints: "Điểm dự kiến",
    landingEstimatedFormula: "2 kg × 1.2 {clean} × 1.2 PET",
    landingConfirmCreateQr: "Xác nhận & Tạo QR",
    landingAdminFeatureAutoPoints: "Tính điểm tự động theo loại nhựa & độ sạch",
    landingAdminFeatureSingleQr: "Mã QR dùng một lần, hết hạn sau 5 phút",
    landingAdminFeatureReports: "Báo cáo theo ngày, tuần, tháng và học kỳ",
    landingAdminFeatureCapacity: "Theo dõi sức chứa từng điểm thu gom",
    landingGamificationLabel: "Hành trình xanh",
    landingLeaderboardTitle: "Bảng xếp hạng tháng",
    landingLeaderboardDescription:
      "Theo dõi điểm tích luỹ và ghi nhận những sinh viên tích cực thu gom nhựa.",
    landingBadgeGold: "🥇 Hạng Vàng",
    landingBadgeGreenStarter: "🌱 Green Starter",
    landingBadgePlasticHero: "♻️ Plastic Hero",
    landingBadgeStreak: "🔥 7 ngày liền",
    landingFooterProjectDescription:
      "Dự án hợp tác giữa sinh viên Đại học Bách khoa Hà Nội, Việt Nam và sinh viên Đại học Jeonbuk National, Hàn Quốc.",
    landingCollaborationSectionTitle: "Kết nối sinh viên, cùng hành động vì môi trường",
    landingCollaborationSectionDescription:
      "FLYSTIC là không gian hợp tác để sinh viên hai trường cùng đưa công nghệ vào những thói quen xanh thiết thực.",
    landingHustName: "Đại học Bách khoa Hà Nội",
    landingHustCountry: "Việt Nam",
    landingJbnuName: "Jeonbuk National University",
    landingJbnuCountry: "Hàn Quốc",
    landingCollaborationFootnote:
      "FLYSTIC được xây dựng trong tinh thần giao lưu học thuật và hợp tác của sinh viên hai trường.",
    landingFooterCopyright: "© 2026 FLYSTIC Platform",
    guideNotAccepted: "Không thu gom",
    guideDetailsLabel: "Đặc điểm:",
    guideCommonItemsLabel: "Sinh viên thường có:",
    guideQuality: "Công thức tính điểm",
    guideQualityHelp: "Bạn tự đánh giá tình trạng rác khi nộp.",
    guideFormula: "Số lượng × Điểm cơ bản × Hệ số chất lượng",
    guideExampleTitle: "Ví dụ",
    guideExampleCleanDry: "10 chai PET sạch và khô → 10 × 10 × 1.5 = 150 điểm.",
    guideExampleDirty: "10 chai PET ẩm/bẩn → 10 × 10 × 0.5 = 50 điểm.",
    guideRewardFormula: "Tổng: {total} điểm",
    guidePointUnit: "điểm/kg",
    guideCleanDry: "Sạch & khô (×1.5)",
    guideNormal: "Bình thường (×1.0)",
    guideDirtyWet: "Bẩn / ướt (×0.5)",
    landingFacultyEconomics: "Khoa Kinh tế",
    landingFacultyIt: "Khoa CNTT",
    landingFacultyEnvironment: "Khoa Môi trường",
    landingFacultyConstruction: "Khoa Xây dựng",
    landingFacultyLanguages: "Khoa Ngoại ngữ",
    adminStation: "Trạm {station}",
    adminCreateTransaction: "Tạo giao dịch",
    adminCollectedWeek: "Đã thu gom (tuần)",
    adminTransactions: "Giao dịch",
    adminPointsOut: "Điểm phát ra",
    adminPending: "Chờ xác nhận",
    adminPlasticBreakdown: "Phân bố loại nhựa (số đơn vị)",
    adminCapacity: "Sức chứa các trạm",
    adminStationFill: "Lượng nhựa hiện tại",
    adminStationFillDetail: "{filled} / {capacity} kg · {percent}% sức chứa",
    adminStationEmpty: "Ghi nhận đã bàn giao",
    adminStationEmptyHint: "Chỉ ghi nhận sau khi nhựa đã được chuyển đến đơn vị tiếp nhận.",
    adminStationEmptySuccess: "Đã ghi nhận bàn giao {weight} kg.",
    adminStationEmptyEmpty: "Trạm hiện chưa có nhựa cần bàn giao.",
    adminRecent: "Giao dịch gần đây",
    adminSeeAll: "Xem tất cả →",
    adminTransactionPending: "Đang chờ",
    adminTransactionConfirmed: "Hoàn thành",
    adminTransactionExpired: "Hết hạn",
    adminTransactionCancelled: "Đã hủy",
    adminTransactionTitle: "Giao dịch",
    adminTransactionDescription: "Toàn bộ giao dịch thu gom của trạm.",
    adminStatusAll: "Tất cả",
    adminSearchPlaceholder: "Tìm theo sinh viên / trạm…",
    adminNoFilterResults: "Không có giao dịch khớp bộ lọc.",
    adminTableStudent: "Sinh viên",
    adminTableStation: "Trạm",
    adminTableDetails: "Chi tiết nhựa",
    adminTableStatus: "Trạng thái",
    adminTablePoints: "Điểm",
    adminFooterShowing: "Hiển thị {filtered} / {total} giao dịch",
    adminUnits: "đv",
    adminDashboardTitle: "Dashboard",
    adminNoData: "Chưa có dữ liệu",
    adminTrendCompleted: "↑ 12%",
    adminTrendThisWeek: "tuần này",
    adminTrendActive: "đang hoạt động",
    adminAwaitingStudent: "Đang chờ sinh viên",
    adminSignOut: "Đăng xuất",
    adminMobileTitle: "FLYSTIC Admin",
    adminConsoleTitle: "Bảng điều khiển Admin",
    adminQrHeader: "MÃ QR CHO SINH VIÊN QUÉT",
    adminTokenExpiresIn: "Mã sẽ hết hạn sau",
    adminTokenExpired: "⏰ Mã đã hết hạn",
    adminStudentConfirmed: "Sinh viên đã xác nhận!",
    adminTransactionDetails: "Chi tiết giao dịch",
    adminTransactionToken: "Mã token",
    adminTransactionStation: "Trạm",
    adminTransactionTypeCount: "Số loại nhựa",
    adminTransactionWeightEstimate: "Khối lượng ước lượng",
    adminTransactionTotalPoints: "Tổng điểm",
    adminTransactionStatus: "Trạng thái",
    adminCancelTransaction: "Hủy giao dịch",
    adminCreateAnotherTransaction: "Tạo giao dịch tiếp theo",
    adminNewTransactionTitle: "Tạo giao dịch thu gom",
    adminNewTransactionDescription:
      "Sinh viên có thể nộp nhiều loại nhựa trong cùng một lần — thêm từng dòng bên dưới.",
    adminCollectionPoint: "Trạm thu gom",
    adminLineNumber: "Loại #{number}",
    adminDeleteLine: "Xóa",
    adminQuantityUnits: "Khối lượng (kg)",
    adminCondition: "Tình trạng",
    adminTypes: "Loại nhựa",
    adminAddOtherType: "+ Thêm loại nhựa khác",
    adminEstimatedPointsHeader: "Tổng điểm dự kiến",
    adminQrCreateButton: "Xác nhận & Tạo QR",
    adminQrExpirationNote: "QR sẽ hết hạn sau 5 phút",
    adminPointsFormulaLabel: "Công thức",
    adminPointsFormulaDetail: "Điểm = Số lượng × Điểm cơ bản × Hệ số chất lượng",
    copy: "Sao chép",
    copied: "Đã sao chép",
    adminReportsTitle: "Báo cáo",
    adminReportsDescription: "Thống kê thu gom 7 ngày gần nhất.",
    adminExportPdf: "Xuất PDF",
    adminExportExcel: "Xuất Excel",
    adminReportTotalWaste: "Tổng nhựa đã xác nhận",
    adminReportPetBottles: "{count} chai PET",
    adminReportPointsIssued: "Điểm đã phát",
    adminReportTotal: "tổng cộng",
    adminReportTransactions: "giao dịch",
    adminReportCo2Saved: "CO₂ giảm",
    adminReportEquivalent: "tương đương",
    adminReportTrees: "cây xanh",
    adminWeeklyCollectionByDay: "Thu gom theo ngày (kg)",
    adminTopStudents: "Top sinh viên đóng góp",
    adminGoalCollected: "Mục tiêu thu gom",
    adminGoalParticipants: "Mục tiêu sinh viên tham gia",
    adminGoalCo2: "Mục tiêu CO₂ giảm",
    adminMonthlyTargetProgress: "Tiến độ mục tiêu tháng",
    adminReportKgCollected: "{kg} kg đã gom",
    adminReportParticipants: "Sinh viên tham gia",
    adminReportEstimated: "Ước tính theo hệ số quy đổi cấu hình",
    adminReportCsvDownloaded: "Đã tải báo cáo CSV",
    adminReportViewLive: "7 ngày gần nhất",
    adminReportViewDemo: "Demo tháng 6–7/2026",
    adminReportDemoLabel: "Dữ liệu mô phỏng",
    adminReportDemoDescription:
      "Dữ liệu trình diễn FLYSTIC gồm tài khoản và giao dịch hư cấu, không phải số liệu vận hành thực tế.",
    adminRegisteredStudents: "Tài khoản sinh viên",
    adminFundraisingAllocation: "Phân bổ gây quỹ",
    adminDemoFundraisingDetail: "{points} / {total} điểm được chọn gây quỹ",
    adminDemoBreakdown: "Phân bổ theo loại nhựa",
    adminDemoQuality: "Phân bổ theo chất lượng",
    adminQualityClean: "Sạch & khô",
    adminQualityNormal: "Bình thường",
    adminQualityDirty: "Bẩn / ướt",
    leaderboardDescription: "Xem bảng xếp hạng sinh viên theo điểm",
    leaderboardWeek: "Tuần",
    leaderboardAll: "Tất cả",
    leaderboardFaculty: "Khoa",
    leaderboardYourRank: "Xếp hạng của bạn",
    leaderboardTipsTitle: "Mẹo thăng hạng",
    leaderboardTipCleanDry: "Tập trung vào nhựa sạch, khô để nhận nhiều điểm hơn.",
    leaderboardTipPrioritize: "Quét vào giờ ít người để giảm thời gian chờ.",
    leaderboardTipInviteFriends: "Mời bạn bè cùng tham gia để tạo động lực nhóm.",
    leaderboardMembers: "thành viên",
    leaderboardYouSuffix: " (Bạn)",
  },
  en: {
    languageLabel: "Language",
    english: "English",
    vietnamese: "Vietnamese",
    korean: "한국어",
    backHome: "← Back home",
    authLogin: "Log in",
    authRegister: "Sign up",
    authWelcomeBack: "Welcome back to FLYSTIC.",
    authStartGreen: "Start your green journey.",
    authStudentRole: "🎓 Student",
    authAdminRole: "🛠️ Station admin",
    authFullName: "Full name",
    authStudentEmail: "Student email",
    authAdminEmail: "Admin email",
    authBirthDate: "Date of birth",
    authOrganization: "Institution",
    authOrganizationPlaceholder: "Select an institution",
    authOrganizationHust: "Hanoi University of Science and Technology",
    authOrganizationOther: "Other",
    authOrganizationDetail: "Institution details",
    authOrganizationDetailPlaceholder: "Enter school, organization, or institution name",
    authSchool: "School / institute",
    authSchoolPlaceholder: "Select a school / institute",
    authStudentId: "Student ID",
    authStudentIdPlaceholder: "Enter your student ID",
    authPassword: "Password",
    authConfirmPassword: "Confirm password",
    authPasswordMismatch: "Passwords do not match.",
    authAdminInviteCode: "Administrator invite code",
    authSubmitting: "Working...",
    authServerError: "Authentication failed. Please check your information.",
    authEmailPlaceholderStudent: "minhson@student.edu.vn",
    authEmailPlaceholderAdmin: "admin@yoha.io.vn",
    authPasswordPlaceholder: "••••••••",
    authNoAccount: "No account? ",
    authHaveAccount: "Already have an account? ",
    authSignUpNow: "Sign up now",
    authSignInNow: "Sign in",
    authDemoNote: "Prototype: data is currently stored on this device.",
    routeHome: "Home",
    routeMap: "Map",
    routeScan: "Scan QR",
    routeRewards: "Rewards",
    routeProfile: "Profile",
    routeDashboard: "Dashboard",
    routeNewTransaction: "New transaction",
    routeTransactions: "Transactions",
    routeReports: "Reports",
    studentGreeting: "Good morning,",
    studentCurrentPoints: "Current points",
    studentPoints: "points",
    studentNearest: "Nearby collection points",
    studentViewMap: "View map →",
    studentNoTransactions: "No recent activity. Try scanning a QR code!",
    studentCollected: "Collected",
    studentTransactions: "Transactions",
    studentScanQr: "Scan QR",
    studentGuideSorting: "Sorting guide",
    studentLeaderboard: "Leaderboard",
    studentNextLevel: "Only {remaining} points to reach Level {next}",
    studentOpenStatus: "Open · {storage}% capacity",
    studentNearFull: "Almost full",
    studentAvailableSpace: "Available",
    mapTitle: "Collection map",
    mapDescription: "Find the nearest collection points on campus.",
    mapFilterAll: "All",
    mapFilterOpen: "Open",
    mapFilterNear: "Almost full",
    mapLabel: "Hanoi University of Science and Technology campus map",
    mapPins: "{count} collection points · HUST",
    mapAddress: "C7 Building, Hanoi University of Science and Technology",
    mapUniversity: "Hanoi University of Science and Technology",
    mapCapacity: "filled",
    mapStorageCurrent: "{filled} / {capacity} kg currently at the station",
    mapZoomIn: "Zoom in",
    mapZoomOut: "Zoom out",
    collectionPointSoictName: "School of Information and Communication Technology",
    collectionPointSoictAddress: "B1 Building, Hanoi University of Science and Technology",
    collectionPointChemLifeName: "School of Chemistry and Life Sciences",
    collectionPointChemLifeAddress: "C3 Building, Hanoi University of Science and Technology",
    collectionPointMechanicalName: "School of Mechanical Engineering",
    collectionPointMechanicalAddress: "C7 Building, Hanoi University of Science and Technology",
    collectionPointInnovationName: "Innovation Center, Hanoi University of Science and Technology",
    collectionPointInnovationAddress:
      "Innovation Center, Hanoi University of Science and Technology",
    scanTitle: "Scan QR code",
    scanDescription: "Scan the code shown by the station admin.",
    scanUnsupported: "Your browser does not support QR scanning",
    scanReady: "Ready to scan QR code",
    scanStarting: "Opening camera...",
    scanCameraPermissionTitle: "Allow camera access",
    scanCameraPermissionDescription:
      "FLYSTIC only uses your camera while scanning a QR code. Allow it in your browser prompt.",
    scanCameraPermissionButton: "Allow camera & scan QR",
    scanCameraActive: "Place the QR code inside the frame to scan it.",
    scanCameraDenied:
      "Camera access was denied. Enable Camera permission for yoha.io.vn in your browser settings and try again.",
    scanStop: "Stop scan",
    scanManualLabel: "Or enter code manually",
    scanTokenPlaceholder: "Paste token here",
    scanUploadLabel: "Scan a QR image from your device",
    scanImageError: "No QR code was found in this image.",
    scanDemoPending: "Pending transactions",
    scanDemoHint: "Choose a transaction created on this device:",
    scanInvalid: "Invalid QR code",
    scanUsed: "This code has already been used",
    scanExpired: "This code has expired",
    scanCancelled: "This transaction was cancelled",
    scanDetectError: "Unable to read QR code from camera",
    scanCameraError: "Unable to open camera. You can still enter code manually.",
    scanSuccessTitle: "Points added successfully!",
    scanSuccessThanks: "Thanks for helping FLYSTIC protect the environment.",
    scanSuccessYouEarned: "You just received",
    scanSuccessPoints: "points from {count} kg of plastic",
    scanScanAgain: "Scan again",
    scanBackHome: "Back home",
    scanConfirmTitle: "Confirm transaction",
    scanConfirmTotal: "Total points earned",
    scanConfirmButton: "Confirm and claim points",
    scanConfirmFail: "Unable to confirm transaction",
    scanStudentRequired:
      "You are signed in as an admin. Scan the QR code with a different student account to claim points.",
    scanSessionExpired: "Your sign-in session has expired. Please sign in again.",
    scanAllocationTitle: "Choose where to accumulate points",
    scanAllocationDescription:
      "Accumulate points for rewards, or choose to support VIT fundraising if you wish.",
    scanFundraisingOption: "Support VIT fundraising",
    scanFundraisingOptionDescription:
      "An optional choice that adds points to your VIT fundraising balance.",
    scanRewardsOption: "Accumulate for rewards",
    scanRewardsOptionDescription: "Add points to your balance for cash or tree rewards.",
    scanSelectAllocation: "Choose where to accumulate points before confirming.",
    studentRecentActivity: "Recent activity",
    communityLabel: "Recycle plastic · Earn points · Redeem rewards",
    communityTitle: "Turn plastic into green rewards",
    communityDescription:
      "Drop off plastic with FLYSTIC, earn points, and redeem cash or a tree. Supporting VIT fundraising is an optional extra way to make an impact.",
    communityHeroImageAlt: "FLYSTIC plastic recycling and green rewards",
    communityPointsLabel: "Your accumulated points",
    communityPointsDescription:
      "Points are recorded after every plastic drop-off so you can track your own green journey.",
    communityFundPointsLabel: "VIT fundraising points",
    communityRewardPointsLabel: "Reward points",
    communityChooseTitle: "How would you like to use your points?",
    communityChooseDescription:
      "Rewards are FLYSTIC's core benefit. You can also choose to accumulate points for VIT fundraising.",
    communityFundraisingOption: "Support VIT fundraising",
    communityFundraisingOptionDescription:
      "An optional space for VIT's fundraising activities and campaigns.",
    communityRewardsOption: "Redeem rewards",
    communityRewardsOptionDescription: "See the available point redemption options.",
    communityBackToChoices: "Back to choices",
    communityFundraisingTeams: "Partner volunteer teams",
    communityVitTeam: "School of Information and Communication Technology Volunteer Student Team",
    communityVitTeamDescription:
      "An energetic student organization for young people who enjoy contributing, connecting, and helping the community.",
    communityMoreTeams: "More volunteer teams will be added here.",
    communityRewardsTitle: "Redeem points for green rewards",
    communityRewardsDescription:
      "Each redemption is confirmed by FLYSTIC, with collection guidance announced in the app and on the fanpage.",
    communityCashReward: "Redeem points for cash",
    communityCashRewardDetail: "1,000 points = 10,000 VND",
    communityTreeReward: "Redeem points for a tree",
    communityTreeRewardDetail: "500 points = 1 tree",
    communityRewardBalance: "You have {points} points",
    communityRewardCashAvailable: "Up to {count} redemption(s) with this option",
    communityRewardTreesAvailable: "Up to {count} tree(s) with this option",
    communityRewardContact: "Email FLYSTIC to redeem",
    communityAboutLabel: "About VIT",
    communityAboutTitle: "Who is the SoICT Student Volunteer Team?",
    communityAboutDescription:
      "VIT is a home for students who care about community service. The team connects young people to share, grow through experience, and spread the volunteer spirit.",
    communityMissionTitle: "Mission and goals",
    communityMissionServiceTitle: "Serve the community",
    communityMissionServiceDescription:
      "Support people in difficult circumstances through practical campaigns.",
    communityMissionConnectionTitle: "Connect students",
    communityMissionConnectionDescription:
      "Create space to meet, make friends, and do good together.",
    communityMissionSkillsTitle: "Build skills",
    communityMissionSkillsDescription: "Practise teamwork, communication, and event organisation.",
    communityMissionTechnologyTitle: "Tech for good",
    communityMissionTechnologyDescription:
      "Use IT knowledge to support communities whenever possible.",
    communityFundsTitle: "A clearly recorded journey",
    communityFundsDescription:
      "FLYSTIC records your plastic drop-offs and accumulated points. VIT activities and reports are published on its fanpage.",
    communityFlowCollect: "Collect plastic",
    communityFlowFund: "Accumulate points",
    communityFlowAction: "Track results",
    communityActivitiesLabel: "Featured activities",
    communityActivitiesTitle: "The journeys VIT is spreading",
    communityActivitiesDescription:
      "From campus to local communities, every activity is a chance to share and grow together.",
    communityActivitySummerTitle: "Green Summer 2026",
    communityActivitySummerDescription:
      "Ready to contribute youthful energy to community-support projects in local areas.",
    communityActivitySpringTitle: "Spring of Love 2026",
    communityActivitySpringDescription:
      "Bring students together through sharing and make warmth travel further.",
    communityActivityFundraiserTitle: "Spring of Love Fundraiser 2026",
    communityActivityFundraiserDescription:
      "Raise funds that turn students' shared care into practical support.",
    communityMoreActivitiesTitle: "More meaningful activities await",
    communityMoreActivitiesDescription:
      "Join us and turn your energy and skills into positive impact.",
    communityActivityWelcome: "Welcome to school",
    communityActivityMidAutumn: "Mid-Autumn for children",
    communityActivityWinter: "Warm winter for children",
    communityActivityBlood: "Blood donation",
    communityFollowCta: "Follow the SoICT Volunteer Team",
    communityFollowDescription: "See the latest activities and ways to join VIT on the fanpage.",
    profileImpact: "Environmental impact",
    profileKg: "kg plastic",
    profileBottles: "bottles equivalent",
    profileItems: "items",
    profileBadges: "Your badges",
    profileSettings: "Settings",
    profileHelp: "Help & support",
    profileTerms: "Terms & privacy",
    profileSignOut: "Sign out",
    profileSettingsTitle: "Settings",
    profileSettingsDescription: "Manage your FLYSTIC experience on this device.",
    profileLanguageTitle: "Display language",
    profileLanguageDescription: "Your language choice is saved on this device.",
    profileDataTitle: "Account data",
    profileDataDescription:
      "Account information, points, and collection history are used to operate FLYSTIC features.",
    profileHelpTitle: "Help & support",
    profileHelpDescription: "Follow these three steps to record points from recycled plastic.",
    profileHelpStep1: "Bring sorted plastic to a FLYSTIC collection point shown on the map.",
    profileHelpStep2:
      "A station administrator weighs the plastic and creates a transaction QR code.",
    profileHelpStep3: "Scan the QR code with your student account to receive points.",
    profileHelpContactTitle: "Need more help?",
    profileHelpContactDescription:
      "Email FLYSTIC for support with your account or reward redemption.",
    profileTermsTitle: "Terms & privacy",
    profileTermsDescription: "The following applies to use of the current FLYSTIC platform.",
    profileTermsUseTitle: "Using the platform",
    profileTermsUseDescription:
      "Provide accurate information, scan only valid transaction QR codes, and do not share a transaction code with another person.",
    profileTermsDataTitle: "Data we record",
    profileTermsDataDescription:
      "FLYSTIC records account details, points, plastic weight, and transaction history to verify benefits and operate collection points.",
    profileTermsPrivacyTitle: "Security and privacy",
    profileTermsPrivacyDescription:
      "Data is used only to operate FLYSTIC; we do not sell personal information. Contact the project team if you need help with your data.",
    profileTermsContact:
      "Contact myanh260305@gmail.com with questions about terms or personal data.",
    guideTitle: "Plastic sorting guide",
    guideDescription:
      "FLYSTIC collects 5 recyclable plastic types. Check the ♻️ symbol on the bottom of products.",
    guideHowItWorks: "How it works",
    guideStepsHeadline: "Four steps from plastic waste to accumulated points",
    guideAccepted: "Accepted",
    guideNotAccepted: "Not accepted",
    guideDetailsLabel: "Details:",
    guideCommonItemsLabel: "Common items:",
    guideQuality: "Point calculation formula",
    guideQualityHelp: "You rate the condition of the waste when you submit it.",
    guideFormula: "Quantity × Base points × Quality multiplier",
    guideExampleTitle: "Example",
    guideExampleCleanDry: "10 clean, dry PET bottles → 10 × 10 × 1.5 = 150 points.",
    guideExampleDirty: "10 wet/dirty PET bottles → 10 × 10 × 0.5 = 50 points.",
    guideRewardFormula: "Total: {total} points",
    guidePointUnit: "points/kg",
    guideCleanDry: "Clean & dry (×1.5)",
    guideNormal: "Normal (×1.0)",
    guideDirtyWet: "Dirty / wet (×0.5)",
    landingNavHow: "How it works",
    landingNavAdmin: "Admin",
    landingNavLeaderboard: "Leaderboard",
    landingNavCollaboration: "Collaboration",
    landingLogin: "Login",
    landingHeroLabel: "A student collaboration project: HUST × JBNU",
    landingTitleLine1: "FLYSTIC — Turn plastic into",
    landingTitleLine2: "green action on campus",
    landingHeroDescription:
      "FLYSTIC is a collaboration between students at Hanoi University of Science and Technology, Vietnam, and Jeonbuk National University, South Korea. The platform supports plastic sorting, collection, and point recording on campus.",
    landingStartNow: "Start now",
    landingViewMap: "View map",
    landingStatKg: "kg collected",
    landingStatStudents: "students participating",
    landingStatPoints: "collection points",
    landingCurrentPointsLabel: "Current points",
    landingCollectedLabel: "Collected",
    landingSchoolRankLabel: "School rank",
    landingScanQrCta: "Scan collection QR",
    landingPointsToNext: "Only 250 points to the next level",
    landingGreeting: "Good morning,",
    landingPilotLabel: "Pilot collection point",
    landingPilotTitle: "Four collection hubs at HUST",
    landingPilotDescription:
      "School of Information and Communication Technology (B1) · School of Chemistry and Life Sciences (C3) · School of Mechanical Engineering (C7) · Innovation Center.",
    landingCollaborationLabel: "Vietnam–Korea student collaboration",
    landingCollaborationTitle: "HUST × JBNU students building FLYSTIC together",
    landingCollaborationDescription:
      "The project connects students' ideas and technical skills from both universities to encourage greener habits on campus.",
    landingProjectFocusLabel: "Project focus",
    landingProjectFocus: "Plastic sorting · QR scanning · point recording · green rewards",
    landingHowItWorksLabel: "How it works",
    landingHowItWorksTitle: "How FLYSTIC works",
    landingStep1Title: "Bring plastic to a station",
    landingStep1Description: "Find the nearest collection point on campus.",
    landingStep2Title: "Admin weighs & creates transaction",
    landingStep2Description:
      "Enter plastic type, weight, and cleanliness. The system generates a QR code.",
    landingStep3Title: "Scan QR — earn points",
    landingStep3Description:
      "Accumulate points for rewards, or optionally support VIT fundraising.",
    landingStep4Title: "Redeem rewards when ready",
    landingStep4Description:
      "Accumulate points for cash or a tree; VIT activities remain available in the community section.",
    landingProjectLabel: "The FLYSTIC platform",
    landingAdminLabel: "For admins",
    landingAdminTitle: "What FLYSTIC currently supports",
    landingAdminDescription:
      "FLYSTIC supports a clear collection flow, from plastic-sorting guidance to QR scanning and recording points for students.",
    landingStationDescription:
      "At the collection point, an administrator creates a transaction after receiving the plastic. A student scans its QR code to confirm it and receive points.",
    landingCapabilityMapTitle: "Collection-point map",
    landingCapabilityMapDescription: "Find the collection point on the HUST campus.",
    landingCapabilitySortingTitle: "Sorting guide",
    landingCapabilitySortingDescription:
      "Learn about the five plastic types currently accepted by FLYSTIC.",
    landingCapabilityQrTitle: "QR confirmation",
    landingCapabilityQrDescription:
      "A transaction is confirmed when the student scans its QR code at the station.",
    landingCapabilityRewardTitle: "Point recording",
    landingCapabilityRewardDescription:
      "Accumulated points track participation and can be redeemed for rewards.",
    landingAdminTransactionTitle: "Collection slip",
    landingAdminStationTag: "Dorm A Station",
    landingPlasticType: "Plastic type",
    landingPlasticExamplePet: "PET",
    landingPlasticExampleHdpe: "HDPE",
    landingPlasticExamplePp: "PP",
    landingWeightKg: "Weight (kg)",
    landingCleanliness: "Cleanliness",
    landingClean: "Clean",
    landingOk: "OK",
    landingDirty: "Dirty",
    landingEstimatedPoints: "Estimated points",
    landingEstimatedFormula: "2 kg × 1.2 {clean} × 1.2 PET",
    landingConfirmCreateQr: "Confirm & generate QR",
    landingAdminFeatureAutoPoints: "Automatic points based on plastic type & cleanliness",
    landingAdminFeatureSingleQr: "Single-use QR codes, expires after 5 minutes",
    landingAdminFeatureReports: "Reports by day, week, month, and semester",
    landingAdminFeatureCapacity: "Track each collection point's capacity",
    landingGamificationLabel: "Green journey",
    landingLeaderboardTitle: "Monthly leaderboard",
    landingLeaderboardDescription:
      "Track accumulated points and recognise students who actively collect plastic.",
    landingBadgeGold: "🥇 Gold rank",
    landingBadgeGreenStarter: "🌱 Green starter",
    landingBadgePlasticHero: "♻️ Plastic hero",
    landingBadgeStreak: "🔥 7-day streak",
    landingFooterProjectDescription:
      "A student collaboration project between Hanoi University of Science and Technology, Vietnam, and Jeonbuk National University, South Korea.",
    landingCollaborationSectionTitle: "Connecting students to act for the environment together",
    landingCollaborationSectionDescription:
      "FLYSTIC is a collaborative space for students from both universities to bring technology into practical green habits.",
    landingHustName: "Hanoi University of Science and Technology",
    landingHustCountry: "Vietnam",
    landingJbnuName: "Jeonbuk National University",
    landingJbnuCountry: "South Korea",
    landingCollaborationFootnote:
      "FLYSTIC is built in the spirit of academic exchange and student collaboration between the two universities.",
    landingFooterCopyright: "© 2026 FLYSTIC Platform",
    landingFacultyEconomics: "Faculty of Economics",
    landingFacultyIt: "Faculty of IT",
    landingFacultyEnvironment: "Faculty of Environmental Science",
    landingFacultyConstruction: "Faculty of Civil Engineering",
    landingFacultyLanguages: "Faculty of Foreign Languages",
    adminStation: "Station {station}",
    adminCreateTransaction: "Create transaction",
    adminCollectedWeek: "Collected (week)",
    adminTransactions: "Transactions",
    adminPointsOut: "Points issued",
    adminPending: "Awaiting confirmation",
    adminPlasticBreakdown: "Plastic type breakdown (units)",
    adminCapacity: "Station capacity",
    adminStationFill: "Current plastic at station",
    adminStationFillDetail: "{filled} / {capacity} kg · {percent}% capacity",
    adminStationEmpty: "Record handover",
    adminStationEmptyHint:
      "Only record this after plastic is transferred to the receiving partner.",
    adminStationEmptySuccess: "Recorded handover of {weight} kg.",
    adminStationEmptyEmpty: "There is no plastic to hand over at this station.",
    adminRecent: "Recent transactions",
    adminSeeAll: "View all →",
    adminTransactionPending: "Pending",
    adminTransactionConfirmed: "Confirmed",
    adminTransactionExpired: "Expired",
    adminTransactionCancelled: "Cancelled",
    adminTransactionTitle: "Transactions",
    adminTransactionDescription: "All collection transactions for this station.",
    adminStatusAll: "All",
    adminSearchPlaceholder: "Search by student / station…",
    adminNoFilterResults: "No transactions match the filters.",
    adminTableStudent: "Student",
    adminTableStation: "Station",
    adminTableDetails: "Plastic details",
    adminTableStatus: "Status",
    adminTablePoints: "Points",
    adminFooterShowing: "Showing {filtered} / {total} transactions",
    adminUnits: "units",
    adminTypes: "plastic types",
    adminDashboardTitle: "Dashboard",
    adminNoData: "No data yet",
    adminTrendCompleted: "↑ 12%",
    adminTrendThisWeek: "This week",
    adminTrendActive: "Active",
    adminAwaitingStudent: "Awaiting student",
    adminSignOut: "Sign out",
    adminMobileTitle: "FLYSTIC Admin",
    adminConsoleTitle: "Admin console",
    adminQrHeader: "QR code for student scan",
    adminTokenExpiresIn: "Token expires in",
    adminTokenExpired: "⏰ Token has expired",
    adminStudentConfirmed: "Student confirmed!",
    adminTransactionDetails: "Transaction details",
    adminTransactionToken: "Token",
    adminTransactionStation: "Station",
    adminTransactionTypeCount: "Plastic type count",
    adminTransactionWeightEstimate: "Estimated weight",
    adminTransactionTotalPoints: "Total points",
    adminTransactionStatus: "Status",
    adminCancelTransaction: "Cancel transaction",
    adminCreateAnotherTransaction: "Create another transaction",
    adminNewTransactionTitle: "Create collection transaction",
    adminNewTransactionDescription:
      "Students can submit multiple plastic types in one session — add each line below.",
    adminCollectionPoint: "Collection point",
    adminLineNumber: "Type #{number}",
    adminDeleteLine: "Remove",
    adminQuantityUnits: "Weight (kg)",
    adminCondition: "Condition",
    adminAddOtherType: "+ Add another plastic type",
    adminEstimatedPointsHeader: "Estimated points",
    adminQrCreateButton: "Confirm & generate QR",
    adminQrExpirationNote: "QR expires in 5 minutes",
    adminPointsFormulaLabel: "Formula",
    adminPointsFormulaDetail: "Points = Quantity × Base points × Quality multiplier",
    copy: "Copy",
    copied: "Copied",
    adminReportsTitle: "Reports",
    adminReportsDescription: "Collection insights for the last 7 days.",
    adminExportPdf: "Export PDF",
    adminExportExcel: "Export Excel",
    adminReportTotalWaste: "Confirmed plastic collected",
    adminReportPetBottles: "{count} PET bottles",
    adminReportPointsIssued: "Points issued",
    adminReportTotal: "total",
    adminReportTransactions: "transactions",
    adminReportCo2Saved: "CO₂ saved",
    adminReportEquivalent: "Equivalent",
    adminReportTrees: "trees",
    adminWeeklyCollectionByDay: "Daily collection (kg)",
    adminTopStudents: "Top contributors",
    adminGoalCollected: "Collection goal",
    adminGoalParticipants: "Student participation goal",
    adminGoalCo2: "CO₂ reduction goal",
    adminMonthlyTargetProgress: "Monthly target progress",
    adminReportKgCollected: "{kg} kg collected",
    adminReportParticipants: "Participating students",
    adminReportEstimated: "Estimated from the configured conversion factor",
    adminReportCsvDownloaded: "CSV report downloaded",
    adminReportViewLive: "Last 7 days",
    adminReportDemoDescription:
      "FLYSTIC product-demo data made of fictional accounts and transactions, not real operating results.",
    adminRegisteredStudents: "Registered student accounts",
    adminFundraisingAllocation: "Fundraising allocation",
    adminDemoFundraisingDetail: "{points} / {total} points allocated to fundraising",
    adminDemoBreakdown: "Plastic-type distribution",
    adminDemoQuality: "Collection-quality distribution",
    adminQualityClean: "Clean & dry",
    adminQualityNormal: "Normal",
    adminQualityDirty: "Dirty / wet",
    leaderboardDescription: "See how students rank by points",
    leaderboardWeek: "Week",
    leaderboardAll: "All",
    leaderboardFaculty: "Faculty",
    leaderboardYourRank: "Your rank",
    leaderboardTipsTitle: "Rank-up tips",
    leaderboardTipCleanDry: "Focus on clean, dry plastic for higher points.",
    leaderboardTipPrioritize: "Scan during quiet times to reduce wait.",
    leaderboardTipInviteFriends: "Invite friends to build team momentum.",
    leaderboardMembers: "members",
    leaderboardYouSuffix: " (You)",
  },
  ko: KOREAN_TRANSLATIONS,
} as const;

export type TranslationKey = keyof (typeof TRANSLATIONS)[typeof DEFAULT_LOCALE];

export function translate(
  key: TranslationKey,
  locale: Locale,
  params?: Record<string, string | number>,
): string {
  const fallback = locale === "ko" ? TRANSLATIONS.en[key] : TRANSLATIONS.vi[key];
  const template = String(TRANSLATIONS[locale][key] ?? fallback);
  if (!params) return template;
  return Object.entries(params).reduce(
    (text, [paramKey, value]) => text.replace(`{${paramKey}}`, String(value)),
    template,
  );
}

export function localeToNumberFormat(locale: Locale) {
  if (locale === "en") return "en-US";
  if (locale === "ko") return "ko-KR";
  return "vi-VN";
}

/** Điểm cơ bản theo mã nhựa (mỗi kg) */
export const PLASTIC_BASE: Record<PlasticType, number> = {
  PET: 10,
  HDPE: 10,
  PP: 8,
  LDPE: 2,
  PS: 1,
};

/** Hệ số chất lượng */
export const CLEAN_MULT: Record<Cleanliness, number> = {
  CLEAN: 1.5,
  NORMAL: 1.0,
  DIRTY: 0.5,
};

export const PLASTIC_LABELS: Record<PlasticType, string> = {
  PET: "PET (#1) — Chai nước trong",
  HDPE: "HDPE (#2) — Chai nhựa đục",
  PP: "PP (#5) — Hộp/Ly trà sữa",
  LDPE: "LDPE (#4) — Túi nilon",
  PS: "PS (#6) — Hộp xốp, muỗng nĩa",
};

export const PLASTIC_SHORT: Record<PlasticType, string> = {
  PET: "PET",
  HDPE: "HDPE",
  PP: "PP",
  LDPE: "LDPE",
  PS: "PS",
};

export const PLASTIC_ICON: Record<PlasticType, string> = {
  PET: "🧴",
  HDPE: "🧼",
  PP: "🥤",
  LDPE: "🛍️",
  PS: "🥡",
};

export const CLEAN_LABELS: Record<Cleanliness, string> = {
  CLEAN: "Sạch & Khô (×1.5)",
  NORMAL: "Bình thường (×1.0)",
  DIRTY: "Bẩn / Ướt (×0.5)",
};

export const CLEAN_SHORT: Record<Cleanliness, string> = {
  CLEAN: "Sạch",
  NORMAL: "Bình thường",
  DIRTY: "Bẩn",
};

export function calculatePoints(
  quantity: number,
  plasticType: PlasticType,
  cleanliness: Cleanliness,
) {
  const q = Math.max(0, Math.round(quantity * 100) / 100);
  return Math.round(q * PLASTIC_BASE[plasticType] * CLEAN_MULT[cleanliness]);
}

export function estimateWeightKg(quantity: number) {
  return +Math.max(0, quantity).toFixed(2);
}

export const COLLECTION_POINTS = [
  {
    id: "soict-b1",
    name: "Trường Công nghệ Thông tin và Truyền thông",
    address: "Tòa B1, Đại học Bách khoa Hà Nội",
    capacityKg: 25,
    mapPosition: { x: "65%", y: "55%" },
  },
  {
    id: "chem-life-c3",
    name: "Trường Hóa và Khoa học Sự sống",
    address: "Tòa C3, Đại học Bách khoa Hà Nội",
    capacityKg: 25,
    mapPosition: { x: "35%", y: "24%" },
  },
  {
    id: "mechanical-c7",
    name: "Trường Cơ khí",
    address: "Tòa C7, Đại học Bách khoa Hà Nội",
    capacityKg: 25,
    mapPosition: { x: "49%", y: "35%" },
  },
  {
    id: "innovation-center",
    name: "Trung tâm Đổi mới Sáng tạo - Đại học Bách khoa Hà Nội",
    address: "Tòa nhà C7, Đại học Bách khoa Hà Nội",
    capacityKg: 25,
    mapPosition: { x: "19%", y: "54%" },
  },
] as const;

const COLLECTION_POINT_TRANSLATION_KEYS: Record<
  (typeof COLLECTION_POINTS)[number]["id"],
  { name: TranslationKey; address: TranslationKey }
> = {
  "soict-b1": { name: "collectionPointSoictName", address: "collectionPointSoictAddress" },
  "chem-life-c3": {
    name: "collectionPointChemLifeName",
    address: "collectionPointChemLifeAddress",
  },
  "mechanical-c7": {
    name: "collectionPointMechanicalName",
    address: "collectionPointMechanicalAddress",
  },
  "innovation-center": {
    name: "collectionPointInnovationName",
    address: "collectionPointInnovationAddress",
  },
};

type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string;

/** Keeps canonical station names for API records while displaying the selected locale. */
export function getLocalizedCollectionPoint(
  pointOrName: (typeof COLLECTION_POINTS)[number] | string,
  t: Translate,
) {
  const point =
    typeof pointOrName === "string"
      ? COLLECTION_POINTS.find((item) => item.name === pointOrName)
      : pointOrName;
  if (!point) return { name: typeof pointOrName === "string" ? pointOrName : "", address: "" };

  const keys = COLLECTION_POINT_TRANSLATION_KEYS[point.id];
  return { name: t(keys.name), address: t(keys.address) };
}

export function getTransactionStatus(
  transaction: Transaction,
  now = Date.now(),
): TransactionStatus {
  if (transaction.status === "pending" && now > transaction.expiresAt) return "expired";
  return transaction.status;
}

export function getStationFillKg(
  transactions: Transaction[],
  collectionRuns: CollectionRun[],
  collectionPoint: string,
) {
  const receivedKg = transactions
    .filter(
      (transaction) =>
        transaction.collectionPoint === collectionPoint &&
        getTransactionStatus(transaction) === "confirmed",
    )
    .reduce((sum, transaction) => sum + transaction.weightKg, 0);
  const transferredKg = collectionRuns
    .filter((run) => run.collectionPoint === collectionPoint)
    .reduce((sum, run) => sum + run.weightKg, 0);

  return +Math.max(0, receivedKg - transferredKg).toFixed(2);
}

export function getStationFillPercent(
  transactions: Transaction[],
  collectionRuns: CollectionRun[],
  point: (typeof COLLECTION_POINTS)[number],
) {
  const filledKg = getStationFillKg(transactions, collectionRuns, point.name);
  return Math.min(100, Math.round((filledKg / point.capacityKg) * 100));
}

const initial: State = {
  user: null,
  points: 0,
  rewardPoints: 0,
  fundPoints: 0,
  totalKg: 0,
  transactions: [],
  collectionRuns: [],
  stations: COLLECTION_POINTS.map((point) => ({
    id: point.id,
    name: point.name,
    address: point.address,
    latitude: null,
    longitude: null,
    capacityKg: point.capacityKg,
    filledKg: 0,
    fillPercent: 0,
  })),
  leaderboard: [],
  demoCampaign: null,
  locale: DEFAULT_LOCALE,
};

function load(): State {
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      ...initial,
      ...parsed,
      transactions: (parsed.transactions ?? []).filter(
        (transaction) => transaction.userId !== "demo",
      ),
      collectionRuns: parsed.collectionRuns ?? [],
      stations: parsed.stations ?? initial.stations,
      leaderboard: parsed.leaderboard ?? [],
      locale: parsed.locale ?? DEFAULT_LOCALE,
    };
  } catch {
    return initial;
  }
}

type Ctx = {
  state: State;
  locale: Locale;
  isReady: boolean;
  isRemote: boolean;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  signIn: (input: {
    email: string;
    password: string;
    mode: "login" | "register";
    role: Role;
    registration?: {
      name?: string;
      birthDate?: string;
      organization?: StudentOrganization;
      school?: string;
      organizationDetail?: string;
      studentId?: string;
    };
    inviteCode?: string;
  }) => Promise<User>;
  signOut: () => void;
  createTransaction: (input: {
    items: { plasticType: PlasticType; quantity: number; cleanliness: Cleanliness }[];
    collectionPoint: string;
  }) => Promise<Transaction>;
  getTransaction: (token: string) => Promise<Transaction | null>;
  confirmTransaction: (
    token: string,
    destination: PointDestination,
    transaction?: Transaction,
  ) => Promise<Transaction | null>;
  cancelTransaction: (id: string) => Promise<void>;
  emptyCollectionPoint: (collectionPoint: string) => Promise<CollectionRun | null>;
  getLeaderboard: (period: "week" | "all") => Promise<LeaderboardRow[]>;
  refresh: () => Promise<void>;
};

const YohaContext = createContext<Ctx | null>(null);

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomToken(length = 12) {
  const cryptoApi = typeof window !== "undefined" ? window.crypto : undefined;
  const bytes = cryptoApi ? new Uint8Array(length) : null;
  if (bytes) cryptoApi?.getRandomValues(bytes);

  return Array.from({ length }, (_, i) => {
    const n = bytes ? bytes[i] : Math.floor(Math.random() * 256);
    return TOKEN_ALPHABET[n % TOKEN_ALPHABET.length];
  }).join("");
}

function transactionToken(existing: string[] = []) {
  const used = new Set(existing);
  let token = randomToken();
  while (used.has(token)) token = randomToken();
  return token;
}

function buildItems(
  raw: { plasticType: PlasticType; quantity: number; cleanliness: Cleanliness }[],
): {
  items: TxItem[];
  points: number;
  totalQuantity: number;
  weightKg: number;
} {
  const items: TxItem[] = raw
    .filter((r) => r.quantity > 0)
    .map((r) => ({
      plasticType: r.plasticType,
      quantity: +Math.max(0, r.quantity).toFixed(2),
      cleanliness: r.cleanliness,
      points: calculatePoints(r.quantity, r.plasticType, r.cleanliness),
    }));
  const points = items.reduce((s, i) => s + i.points, 0);
  const totalQuantity = +items.reduce((s, i) => s + i.quantity, 0).toFixed(2);
  const weightKg = totalQuantity;
  return { items, points, totalQuantity, weightKg };
}

function readRemoteSession() {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? "null") as {
      token?: unknown;
    } | null;
    return typeof parsed?.token === "string" ? parsed.token : null;
  } catch {
    return null;
  }
}

function persistRemoteSession(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(SESSION_KEY, JSON.stringify({ token }));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // A temporary in-memory session is still usable when browser storage is unavailable.
  }
}

function readPersistedLocale() {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const locale = window.localStorage.getItem(LOCALE_KEY);
    return locale === "en" || locale === "ko" ? locale : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function mapApiUser(user: ApiUser, stations: Station[]): User {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    studentId: user.studentId ?? undefined,
    faculty: user.faculty ?? undefined,
    collectionPoint: stations.find((station) => station.id === user.stationId)?.name,
  };
}

function mapApiTransaction(transaction: ApiTransaction): Transaction {
  return {
    id: transaction.id,
    token: transaction.token ?? "",
    userId: transaction.userId,
    userName: transaction.userName,
    userFaculty: transaction.userFaculty,
    adminId: transaction.adminId,
    collectionPoint: transaction.collectionPoint,
    items: transaction.items.map((item) => ({
      plasticType: item.plasticType as PlasticType,
      quantity: item.quantity,
      cleanliness: item.cleanliness as Cleanliness,
      points: item.points,
    })),
    totalQuantity: transaction.totalQuantity,
    weightKg: transaction.weightKg,
    points: transaction.points,
    status: transaction.status,
    createdAt: transaction.createdAt,
    expiresAt: transaction.expiresAt,
    confirmedAt: transaction.confirmedAt ?? undefined,
  };
}

function mapApiStation(station: ApiStation): Station {
  return { ...station };
}

function mapApiCollectionRun(run: ApiCollectionRun): CollectionRun {
  return {
    id: run.id,
    collectionPoint: run.collectionPoint,
    weightKg: run.weightKg,
    adminId: run.adminId,
    createdAt: run.createdAt,
  };
}

function mapApiLeaderboard(row: ApiLeaderboardRow): LeaderboardRow {
  return { ...row };
}

export function YohaProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [isReady, setIsReady] = useState(false);

  const refreshRemoteState = useCallback(async (token: string | null, locale: Locale) => {
    if (!token) throw new Error("Phiên đăng nhập đã hết hạn");
    const [snapshot, leaderboard] = await Promise.all([
      apiRequest<ApiSnapshot>("/snapshot", { token }),
      apiRequest<{ rows: ApiLeaderboardRow[] }>("/leaderboard?period=all"),
    ]);
    const stations = snapshot.stations.map(mapApiStation);
    const next: State = {
      user: mapApiUser(snapshot.user, stations),
      points: snapshot.user.points,
      rewardPoints: snapshot.user.rewardPoints,
      fundPoints: snapshot.user.fundPoints,
      totalKg: snapshot.user.totalKg,
      transactions: snapshot.transactions.map(mapApiTransaction),
      collectionRuns: snapshot.collectionRuns.map(mapApiCollectionRun),
      stations,
      leaderboard: leaderboard.rows.map(mapApiLeaderboard),
      demoCampaign: snapshot.demoCampaign,
      locale,
    };
    setState(next);
    return next.user!;
  }, []);

  useEffect(() => {
    if (!hasRemoteApi) {
      setState(load());
      setIsReady(true);
      return;
    }
    const locale = readPersistedLocale();
    const token = readRemoteSession();
    if (!token) {
      setState({ ...initial, locale });
      setIsReady(true);
      return;
    }
    void refreshRemoteState(token, locale)
      .catch(() => {
        persistRemoteSession(null);
        setState({ ...initial, locale });
      })
      .finally(() => setIsReady(true));
  }, [refreshRemoteState]);

  useEffect(() => {
    if (!hasRemoteApi && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Browser storage is optional; the in-memory session remains usable.
      }
    }
  }, [state]);

  const signIn: Ctx["signIn"] = async (input) => {
    const registration = input.registration ?? {};
    if (hasRemoteApi) {
      const faculty =
        registration.school ||
        registration.organizationDetail ||
        (registration.organization === "other" ? "Khác" : undefined);
      const response = await apiRequest<{ token: string }>(
        input.mode === "register" ? "/auth/register" : "/auth/login",
        {
          method: "POST",
          body:
            input.mode === "register"
              ? {
                  email: input.email,
                  password: input.password,
                  name: registration.name,
                  role: input.role,
                  studentId: registration.studentId,
                  faculty,
                  ...(input.role === "admin"
                    ? {
                        stationId: COLLECTION_POINTS[0].id,
                        inviteCode: input.inviteCode,
                      }
                    : {}),
                }
              : { email: input.email, password: input.password },
        },
      );
      persistRemoteSession(response.token);
      return refreshRemoteState(response.token, readPersistedLocale());
    }

    const isAdmin = input.role === "admin";
    const user: User = {
      id: uid(),
      email: input.email,
      role: input.role,
      name: registration.name || (isAdmin ? "Admin Trạm" : input.email.split("@")[0]),
      birthDate: isAdmin ? undefined : registration.birthDate,
      organization: isAdmin ? undefined : registration.organization,
      organizationDetail: isAdmin ? undefined : registration.organizationDetail,
      studentId: isAdmin
        ? undefined
        : registration.studentId || "SV" + Math.floor(10000 + Math.random() * 89999),
      faculty: isAdmin
        ? undefined
        : registration.school ||
          registration.organizationDetail ||
          (registration.organization === "other" ? "Khác" : "Khoa CNTT"),
      className: isAdmin ? undefined : "K65-IT3",
      collectionPoint: isAdmin ? COLLECTION_POINTS[0].name : undefined,
    };
    setState((s) => ({ ...s, user }));
    return user;
  };

  const setLocale: Ctx["setLocale"] = (locale) => {
    if (hasRemoteApi && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LOCALE_KEY, locale);
      } catch {
        // Locale preference is optional.
      }
    }
    setState((s) => ({ ...s, locale }));
  };

  const t: Ctx["t"] = (key, params) => translate(key, state.locale, params);

  const signOut = () => {
    if (hasRemoteApi) persistRemoteSession(null);
    setState((s) => ({
      ...s,
      user: null,
      points: 0,
      rewardPoints: 0,
      fundPoints: 0,
      totalKg: 0,
      transactions: [],
    }));
  };

  const createTransaction: Ctx["createTransaction"] = async (input) => {
    if (!state.user || state.user.role !== "admin") throw new Error("Cần đăng nhập admin");
    if (hasRemoteApi) {
      const token = readRemoteSession();
      const transaction = await apiRequest<ApiTransaction>("/admin/transactions", {
        method: "POST",
        token: token ?? undefined,
        body: { items: input.items },
      });
      const mapped = mapApiTransaction(transaction);
      await refreshRemoteState(token, state.locale);
      return mapped;
    }
    const b = buildItems(input.items);
    if (b.items.length === 0) throw new Error("Cần ít nhất 1 loại nhựa");
    const now = Date.now();
    const tx: Transaction = {
      id: uid(),
      token: transactionToken(state.transactions.map((t) => t.token)),
      userId: null,
      userName: null,
      adminId: state.user.id,
      collectionPoint: input.collectionPoint,
      items: b.items,
      totalQuantity: b.totalQuantity,
      weightKg: b.weightKg,
      points: b.points,
      status: "pending",
      createdAt: now,
      expiresAt: now + 5 * 60 * 1000,
    };
    setState((s) => ({ ...s, transactions: [tx, ...s.transactions] }));
    return tx;
  };

  const getTransaction: Ctx["getTransaction"] = async (token) => {
    if (hasRemoteApi) {
      const session = readRemoteSession();
      const transaction = await apiRequest<ApiTransaction>(`/transactions/${token}`, {
        token: session ?? undefined,
      });
      return mapApiTransaction(transaction);
    }
    return state.transactions.find((transaction) => transaction.token === token) ?? null;
  };

  const confirmTransaction: Ctx["confirmTransaction"] = async (token, destination, transaction) => {
    if (hasRemoteApi) {
      const session = readRemoteSession();
      const result = await apiRequest<{ points: number; weightKg: number; confirmedAt: number }>(
        `/transactions/${token}/confirm`,
        { method: "POST", token: session ?? undefined, body: { destination } },
      );
      const confirmed: Transaction | null = transaction
        ? { ...transaction, status: "confirmed", confirmedAt: result.confirmedAt }
        : null;
      try {
        await refreshRemoteState(session, state.locale);
      } catch (error) {
        // The server has already confirmed the transaction. Keep the successful result visible
        // and update the local summary when a non-critical refresh fails.
        console.error("Unable to refresh state after confirming transaction", error);
        setState((current) => ({
          ...current,
          points: current.points + result.points,
          rewardPoints:
            destination === "rewards" ? current.rewardPoints + result.points : current.rewardPoints,
          fundPoints:
            destination === "fundraising" ? current.fundPoints + result.points : current.fundPoints,
          totalKg: +(current.totalKg + result.weightKg).toFixed(2),
          transactions: confirmed
            ? [confirmed, ...current.transactions.filter((item) => item.id !== confirmed.id)]
            : current.transactions,
        }));
      }
      return confirmed;
    }
    const user = state.user;
    if (!user) return null;
    let result: Transaction | null = null;
    setState((s) => {
      const idx = s.transactions.findIndex((t) => t.token === token);
      if (idx === -1) return s;
      const tx = s.transactions[idx];
      if (tx.status !== "pending") return s;
      if (Date.now() > tx.expiresAt) {
        const updated = [...s.transactions];
        updated[idx] = { ...tx, status: "expired" };
        return { ...s, transactions: updated };
      }
      const confirmed: Transaction = {
        ...tx,
        status: "confirmed",
        userId: user.id,
        userName: user.name,
        userFaculty: user.faculty ?? null,
        confirmedAt: Date.now(),
      };
      result = confirmed;
      const updated = [...s.transactions];
      updated[idx] = confirmed;
      return {
        ...s,
        transactions: updated,
        points: s.points + confirmed.points,
        rewardPoints:
          destination === "rewards" ? s.rewardPoints + confirmed.points : s.rewardPoints,
        fundPoints: destination === "fundraising" ? s.fundPoints + confirmed.points : s.fundPoints,
        totalKg: +(s.totalKg + confirmed.weightKg).toFixed(2),
      };
    });
    return result;
  };

  const cancelTransaction: Ctx["cancelTransaction"] = async (id) => {
    if (hasRemoteApi) {
      const token = readRemoteSession();
      await apiRequest(`/admin/transactions/${id}/cancel`, {
        method: "POST",
        token: token ?? undefined,
      });
      await refreshRemoteState(token, state.locale);
      return;
    }
    setState((s) => ({
      ...s,
      transactions: s.transactions.map((t) =>
        t.id === id && t.status === "pending" ? { ...t, status: "cancelled" } : t,
      ),
    }));
  };

  const emptyCollectionPoint: Ctx["emptyCollectionPoint"] = async (collectionPoint) => {
    if (!state.user || state.user.role !== "admin") return null;
    if (hasRemoteApi) {
      const station = state.stations.find((item) => item.name === collectionPoint);
      if (!station) return null;
      const token = readRemoteSession();
      const run = await apiRequest<{
        stationId: string;
        weightKg: number;
        createdAt: number;
      }>(`/admin/stations/${station.id}/transfers`, {
        method: "POST",
        token: token ?? undefined,
        body: {},
      });
      await refreshRemoteState(token, state.locale);
      return {
        id: `${run.stationId}-${run.createdAt}`,
        collectionPoint,
        weightKg: run.weightKg,
        adminId: state.user.id,
        createdAt: run.createdAt,
      };
    }
    const weightKg = getStationFillKg(state.transactions, state.collectionRuns, collectionPoint);
    if (weightKg <= 0) return null;
    const run: CollectionRun = {
      id: uid(),
      collectionPoint,
      weightKg,
      adminId: state.user.id,
      createdAt: Date.now(),
    };
    setState((s) => ({
      ...s,
      collectionRuns: [run, ...s.collectionRuns],
    }));
    return run;
  };

  const refresh = async () => {
    if (!hasRemoteApi) return;
    await refreshRemoteState(readRemoteSession(), state.locale);
  };

  const getLeaderboard = useCallback<Ctx["getLeaderboard"]>(
    async (period) => {
      if (!hasRemoteApi) return state.leaderboard;
      const result = await apiRequest<{ rows: ApiLeaderboardRow[] }>(
        `/leaderboard?period=${period}`,
      );
      return result.rows.map(mapApiLeaderboard);
    },
    [state.leaderboard],
  );

  return (
    <YohaContext.Provider
      value={{
        state,
        locale: state.locale,
        isReady,
        isRemote: hasRemoteApi,
        setLocale,
        t,
        signIn,
        signOut,
        createTransaction,
        confirmTransaction,
        cancelTransaction,
        emptyCollectionPoint,
        getTransaction,
        getLeaderboard,
        refresh,
      }}
    >
      {children}
    </YohaContext.Provider>
  );
}

export function useYoha() {
  const ctx = useContext(YohaContext);
  if (!ctx) throw new Error("useYoha must be inside YohaProvider");
  return ctx;
}

export function useTranslation() {
  const ctx = useContext(YohaContext);
  if (!ctx) throw new Error("useTranslation must be inside YohaProvider");
  return { locale: ctx.locale, setLocale: ctx.setLocale, t: ctx.t };
}
