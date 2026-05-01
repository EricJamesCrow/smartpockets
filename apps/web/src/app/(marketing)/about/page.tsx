import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Avatar } from "@repo/ui/untitledui/base/avatar/avatar";
import { FeaturedIcon } from "@repo/ui/untitledui/foundations/featured-icon/featured-icon";
import {
	GitHub,
	LinkedIn,
} from "@repo/ui/untitledui/foundations/social-icons/index";
import { SectionDivider } from "@repo/ui/untitledui/shared-assets/section-divider";
import { Stars02, MessageChatCircle, GitBranch01 } from "@untitledui/icons";

export const metadata = {
	title: "About",
	description:
		"Learn about SmartPockets — a solo-founder, open source personal finance platform built for power users.",
};

function HeaderCentered() {
	return (
		<section className="relative overflow-hidden bg-primary py-16 md:py-24">
			{/* Soft moss + champagne aurora wash */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 hidden dark:block"
				style={{
					backgroundImage:
						"radial-gradient(circle at 22% 18%, rgba(127,184,154,0.06), transparent 36%), radial-gradient(circle at 78% 14%, rgba(212,197,156,0.04), transparent 32%)",
				}}
			/>
			<div className="relative mx-auto max-w-container px-4 md:px-8">
				<div className="mx-auto max-w-3xl text-center">
					<p className="font-[family-name:var(--font-geist-mono)] text-[0.65rem] uppercase tracking-[0.28em] text-tertiary dark:text-stone-500">
						<span className="mr-2 inline-block h-1 w-1 -translate-y-0.5 rounded-full bg-[var(--sp-moss-mint,#7fb89a)]" />
						I &middot; About
					</p>
					<h1 className="text-primary mt-4 text-balance text-display-md font-medium leading-[1.05] tracking-[-0.025em] md:text-display-lg">
						Built by a{" "}
						<em className="font-[family-name:var(--font-fraunces)] font-medium italic text-stone-300">
							power
						</em>{" "}
						user, for power users.
					</h1>
					<p className="text-tertiary mt-5 max-w-2xl mx-auto text-pretty text-md leading-7 md:mt-6 md:text-lg">
						SmartPockets started because I manage 12+ credit cards and every app
						I tried either broke at scale, charged too much, or sold my data. So
						I built what I actually needed — starting with the credit card
						management features no one gets right, then expanding into a full
						open source personal finance platform you actually own.
					</p>
				</div>
				<div className="mt-12 md:mt-16">
					<div className="aspect-video w-full rounded-2xl border border-secondary bg-tertiary md:rounded-3xl dark:border-[var(--sp-moss-line,rgba(255,255,255,0.08))]" />
				</div>
			</div>
		</section>
	);
}

const stats = [
	{ value: "12+", label: "Cards managed daily by the founder" },
	{ value: "100%", label: "Convex-native, zero API routes" },
	{ value: "11", label: "Plaid integration actions" },
	{ value: "AGPLv3", label: "Fully open source" },
];

function MetricsRow() {
	return (
		<section className="bg-secondary py-16 md:py-24">
			<div className="mx-auto max-w-container px-4 md:px-8">
				<div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
					{stats.map((stat) => (
						<div key={stat.label} className="text-center">
							<p className="text-brand-tertiary_alt text-display-md font-semibold md:text-display-lg">
								{stat.value}
							</p>
							<p className="text-tertiary mt-2 text-md md:text-lg">
								{stat.label}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

const socials = [
	{
		label: "GitHub",
		icon: GitHub,
		href: "https://github.com/EricJamesCrow",
	},
	{
		label: "LinkedIn",
		icon: LinkedIn,
		href: "https://www.linkedin.com/in/ericcrow/",
	},
];

function FounderSection() {
	return (
		<section className="bg-primary py-16 md:py-24">
			<div className="mx-auto max-w-container px-4 md:px-8">
				<div className="mx-auto max-w-3xl text-center">
					<span className="text-brand-secondary text-sm font-semibold md:text-md">
						The founder
					</span>
					<h2 className="text-primary mt-3 text-display-sm font-semibold md:text-display-md">
						Meet the person behind SmartPockets
					</h2>
				</div>
				<div className="mt-12 flex justify-center md:mt-16">
					<div className="flex flex-col items-center text-center">
						<Avatar size="2xl" initials="EC" />
						<h3 className="text-primary mt-6 text-lg font-semibold">
							Eric Crow
						</h3>
						<p className="text-brand-secondary mt-1 text-md font-medium">
							Founder, CrowDevelopment LLC
						</p>
						<p className="text-tertiary mt-4 max-w-xl text-md md:text-lg">
							Computer Science graduate and full-stack developer specializing in
							fintech. After years of managing a complex credit card portfolio
							with spreadsheets and broken apps, I built SmartPockets to be the
							tool I always wanted — open source, self-hostable, and designed
							for people who take their finances seriously. The tech stack
							(Next.js 16, Convex, Plaid, Clerk) was chosen for developer
							experience without sacrificing production quality.
						</p>
						<div className="mt-4 flex items-center gap-4">
							{socials.map(({ label, icon: Icon, href }) => (
								<a
									key={label}
									href={href}
									target="_blank"
									rel="noopener noreferrer"
									className="text-quaternary transition hover:text-tertiary"
									aria-label={label}
								>
									<Icon size={24} />
								</a>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

function VisionSection() {
	return (
		<section className="bg-secondary py-16 md:py-24">
			<div className="mx-auto max-w-container px-4 md:px-8">
				<div className="mx-auto max-w-3xl text-center">
					<span className="text-brand-secondary text-sm font-semibold md:text-md">
						Our vision
					</span>
					<h2 className="text-primary mt-3 text-display-sm font-semibold md:text-display-md">
						Where SmartPockets is headed
					</h2>
					<p className="text-tertiary mt-4 text-lg md:mt-5 md:text-xl">
						SmartPockets follows the Cal.com model — it&apos;s both a product
						you can use and a platform you can fork. Self-host it for free with
						your own API keys, or use the hosted version where we cover the
						infrastructure costs. We&apos;re building the open source personal
						finance platform the community actually deserves, starting with
						credit card management and expanding into budgeting, tax
						categorization, and full transaction management.
					</p>
				</div>
			</div>
		</section>
	);
}

const actions = [
	{
		icon: Stars02,
		title: "Star on GitHub",
		description:
			"Show your support and help others discover SmartPockets by starring the repo.",
		href: "https://github.com/EricJamesCrow/smartpockets",
		linkText: "Star the repo",
	},
	{
		icon: MessageChatCircle,
		title: "Join the waitlist",
		description:
			"Be the first to know when SmartPockets launches and get early access.",
		href: "/#newsletter",
		linkText: "Sign up",
	},
	{
		icon: GitBranch01,
		title: "Contribute",
		description:
			"Check out the contributing guide and help build the future of open source personal finance.",
		href: "https://github.com/EricJamesCrow/smartpockets/blob/main/CONTRIBUTING.md",
		linkText: "Read the guide",
	},
];

function GetInvolvedSection() {
	return (
		<section className="bg-primary py-16 md:py-24">
			<div className="mx-auto max-w-container px-4 md:px-8">
				<div className="mx-auto max-w-3xl text-center">
					<span className="text-brand-secondary text-sm font-semibold md:text-md">
						Get involved
					</span>
					<h2 className="text-primary mt-3 text-display-sm font-semibold md:text-display-md">
						Help shape the future
					</h2>
				</div>
				<div className="mt-12 grid grid-cols-1 gap-8 md:mt-16 md:grid-cols-3">
					{actions.map((action) => {
						const isExternal = action.href.startsWith("http");
						return (
							<div
								key={action.title}
								className="flex flex-col items-center text-center"
							>
								<FeaturedIcon
									icon={action.icon}
									size="lg"
									color="brand"
									theme="modern"
								/>
								<h3 className="text-primary mt-5 text-lg font-semibold">
									{action.title}
								</h3>
								<p className="text-tertiary mt-2 text-md">
									{action.description}
								</p>
								<Button
									href={action.href}
									color="link-color"
									size="lg"
									className="mt-3"
									{...(isExternal
										? {
												target: "_blank",
												rel: "noopener noreferrer",
											}
										: {})}
								>
									{action.linkText}
								</Button>
							</div>
						);
					})}
				</div>
				<p className="text-tertiary mt-12 text-center text-md md:mt-16">
					Whether it&apos;s a bug fix, feature request, or design contribution —
					we welcome it all.
				</p>
			</div>
		</section>
	);
}

export default function AboutPage() {
	return (
		<>
			<HeaderCentered />
			<SectionDivider />
			<MetricsRow />
			<SectionDivider />
			<FounderSection />
			<SectionDivider />
			<VisionSection />
			<SectionDivider />
			<GetInvolvedSection />
		</>
	);
}
