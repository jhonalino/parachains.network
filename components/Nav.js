import Link from 'next/link';

export default function Nav() {

    var suffix = "/ksm/crowdloans";

    return (
        <div className="w-full bg-transparent font-light">
            <div className="max-w-screen-2xl m-auto">
                <Link href={suffix}>
                    <a className="px-4 py-2 inline-block text-gray-500 hover:text-gray-300">
                        Overview
                    </a>
                </Link>
                <Link href={suffix}>
                    <a className="px-4 py-2 inline-block text-gray-500 hover:text-gray-300">
                        Parathreads
                    </a>
                </Link>
                <Link href={suffix}>
                    <a className="px-4 py-2 inline-block text-gray-500 hover:text-gray-300">
                        Auctions
                    </a>
                </Link>
                <Link href={suffix}>
                    <a className="px-4 py-2 text-para border-b border-para inline-block border-opacity-25">
                        Crowdloans
                    </a>
                </Link>
            </div>
        </div>
    );

}