import Link from 'next/link';

export default function Header() {
    return (
        <div className="h-16 w-full border border-b border-gray-700 border-opacity-10 mb-2 bg-white">
            <div className="max-w-screen-xl m-auto flex justify-between items-center h-full p-2">
                <Link href="/">
                    <a>
                        <h1 className="uppercase text-2xl font-bold font-accent">stakingrewards</h1>
                    </a>
                </Link>

                <Link href="https://github.com/jhonalino/staking-rewards-collector">
                    <a className="ml-1">
                        <img src="/github-mark.png" alt="github logo" className="w-8" />
                    </a>
                </Link>
            </div>
        </div>
    );
}