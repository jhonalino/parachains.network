import Link from 'next/link';
import { useRouter } from 'next/router';

const NavLink = function (props) {

    const router = useRouter();

    const { href, text } = props;

    return (
        <Link href={href}>
            <a className={href === router.asPath?.toString() ?
                `px-4 py-2 inline-block text-para border-b border-para border-opacity-25` :
                `px-4 py-2 inline-block text-gray-500 hover:text-gray-300`} >
                {text}
            </a>
        </Link>
    );

}

export default function Nav() {

    const router = useRouter();

    console.log(router.asPath);

    var suffix = "/ksm/crowdloans";

    return (
        <div className="w-full bg-transparent font-light">
            <div className="max-w-screen-2xl m-auto">
                <NavLink href="/" text="Overview">
                </NavLink>

                <NavLink href="/ksm/parathreads" text="Parathreads">
                </NavLink>

                <NavLink href="/" text="Auctions">
                </NavLink>

                <NavLink href="/ksm/crowdloans" text="Crowdloans">
                </NavLink>

            </div>
        </div>
    );

}